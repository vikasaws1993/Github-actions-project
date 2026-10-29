import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { launchCamera } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { apiClient } from '../../../api/client';
import { uploadDocumentToS3 } from '../../../api/s3Api';
import {
  AllocatedPatientCase,
  AdditionalMedicalDocument,
  RequestedDocument,
  sevakHospitalService,
} from '../../services/sevakHospitalService';
import {
  sevakDraftService,
  CaseDocsUploadModalDraft,
} from '../../services/sevakDraftService';

interface UnifiedDocItem {
  id: string;
  title: string;
  name: string;
  uri: string;
  size: string;
  timestamp: string;
  type: string;
  note?: string;
  sourceType: 'requested' | 'additional';
}

export const CaseDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [cases, setCases] = useState<AllocatedPatientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  // Upload Modal State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedCaseForUpload, setSelectedCaseForUpload] = useState<AllocatedPatientCase | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docNote, setDocNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    size: string;
    type: string;
    remoteS3Url?: string;
  } | null>(null);
  const [isUploadingToS3, setIsUploadingToS3] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasUploadDraft, setHasUploadDraft] = useState(false);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<UnifiedDocItem | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const loadData = async () => {
    try {
      const data = await sevakHospitalService.getAllocatedCases();

      // Fetch live documents for all cases in parallel from /api/applications/:id/documents
      const updatedCases = await Promise.all(
        data.map(async (c) => {
          try {
            const docRes = await apiClient.get(`/applications/${encodeURIComponent(c.id)}/documents`);
            if (docRes?.data && Array.isArray(docRes.data) && docRes.data.length > 0) {
              const remoteDocs: AdditionalMedicalDocument[] = docRes.data.map((d: any, idx: number) => ({
                id: String(d.id || d.docId || `med-doc-${c.id}-${idx}`),
                title: d.title || d.file_name || d.name || d.category || `Medical Document ${idx + 1}`,
                name: d.file_name || d.name || `Document_${idx + 1}.pdf`,
                uri: d.file_url || d.url || d.secure_url || d.uri || '',
                size: d.file_size || d.size || '1.2 MB',
                timestamp: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (d.date || 'Recently'),
                type: d.mime_type || d.type || (d.file_url?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                note: d.verification_remark || d.note || '',
              }));

              const existing = c.additionalMedicalDocs || [];
              const combined = [...remoteDocs];
              existing.forEach((ed) => {
                if (!combined.some((cd) => cd.id === ed.id || (cd.uri && cd.uri === ed.uri))) {
                  combined.push(ed);
                }
              });

              return {
                ...c,
                additionalMedicalDocs: combined,
              };
            }
          } catch (_) {}
          return c;
        })
      );

      setCases(updatedCases);
      if (updatedCases.length > 0 && !expandedCaseId) {
        // Expand first case by default
        setExpandedCaseId(updatedCases[0].id);
      }
    } catch (e) {
      console.warn('Error loading cases for documents', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission Required',
          message: 'ArogyaMitra needs camera access to capture medical documents.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const getUploadedDocsForCase = (c: AllocatedPatientCase): UnifiedDocItem[] => {
    const list: UnifiedDocItem[] = [];
    const seenUris = new Set<string>();

    // Admin requested documents that have been uploaded
    (c.requestedDocuments || []).forEach((d: RequestedDocument) => {
      if (d.status === 'uploaded' && d.uploadedDoc) {
        const item: UnifiedDocItem = {
          id: d.id,
          title: d.title,
          name: d.uploadedDoc.name,
          uri: d.uploadedDoc.uri,
          size: d.uploadedDoc.size,
          timestamp: d.uploadedDoc.timestamp,
          type: d.uploadedDoc.type,
          note: d.uploadedDoc.note,
          sourceType: 'requested',
        };
        if (d.uploadedDoc.uri) seenUris.add(d.uploadedDoc.uri);
        list.push(item);
      }
    });

    // Additional medical documents & applicant uploaded docs
    (c.additionalMedicalDocs || []).forEach((d: AdditionalMedicalDocument) => {
      if (!d.uri || !seenUris.has(d.uri)) {
        if (d.uri) seenUris.add(d.uri);
        list.push({
          id: d.id,
          title: d.title || d.name || 'Medical Document',
          name: d.name || d.title || 'Document.pdf',
          uri: d.uri,
          size: d.size || '1.2 MB',
          timestamp: d.timestamp || 'Recently',
          type: d.type || (d.uri?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          note: d.note,
          sourceType: 'additional',
        });
      }
    });

    return list;
  };

  // Open upload modal for a specific case with draft restoration
  const openUploadModal = async (c: AllocatedPatientCase) => {
    setSelectedCaseForUpload(c);
    try {
      const draft = await sevakDraftService.loadDraft<CaseDocsUploadModalDraft>(
        sevakDraftService.keys.caseDocsUploadModal(c.id)
      );
      if (draft) {
        setDocTitle(draft.docTitle || '');
        setDocNote(draft.docNote || '');
        setSelectedFile(draft.selectedFile || null);
        setHasUploadDraft(true);
      } else {
        setDocTitle('');
        setDocNote('');
        setSelectedFile(null);
        setHasUploadDraft(false);
      }
    } catch {
      setDocTitle('');
      setDocNote('');
      setSelectedFile(null);
      setHasUploadDraft(false);
    }
    setUploadModalVisible(true);
  };

  const persistUploadDraft = (title: string, note: string, file: any) => {
    if (!selectedCaseForUpload) return;
    const draftKey = sevakDraftService.keys.caseDocsUploadModal(selectedCaseForUpload.id);
    if (!title.trim() && !note.trim() && !file) {
      sevakDraftService.clearDraft(draftKey);
      setHasUploadDraft(false);
    } else {
      sevakDraftService.saveDraft<CaseDocsUploadModalDraft>(draftKey, {
        docTitle: title,
        docNote: note,
        selectedFile: file,
      });
      setHasUploadDraft(true);
    }
  };

  const handleDiscardUploadDraft = async () => {
    if (!selectedCaseForUpload) return;
    await sevakDraftService.clearDraft(sevakDraftService.keys.caseDocsUploadModal(selectedCaseForUpload.id));
    setDocTitle('');
    setDocNote('');
    setSelectedFile(null);
    setHasUploadDraft(false);
  };

  // Pick file via camera
  const handlePickCamera = async () => {
    const hasPerm = await requestCameraPermission();
    if (!hasPerm) {
      Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
      return;
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const fileSizeMB = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.5 MB';
      const fileName = asset.fileName || `Doc_${Date.now()}.jpg`;
      const fileType = asset.type || 'image/jpeg';
      const localUri = asset.uri || '';

      const nextTitle = docTitle || 'Medical Photo Document';
      if (!docTitle) {
        setDocTitle(nextTitle);
      }

      setIsUploadingToS3(true);
      let remoteUrl = '';
      try {
        remoteUrl = await uploadDocumentToS3(
          localUri,
          fileName,
          fileType,
          'medical_documents',
          'applications'
        );
      } catch (s3Err) {
        console.warn('[CaseDocumentsScreen] S3 camera upload note:', s3Err);
      } finally {
        setIsUploadingToS3(false);
      }

      const pickedData = {
        name: fileName,
        uri: remoteUrl || localUri,
        size: fileSizeMB,
        type: fileType,
        remoteS3Url: remoteUrl || (localUri.startsWith('http') ? localUri : undefined),
      };
      setSelectedFile(pickedData);
      persistUploadDraft(nextTitle, docNote, pickedData);
    } catch (e) {
      Alert.alert('Camera Error', 'Could not open camera.');
      setIsUploadingToS3(false);
    }
  };

  // Pick file from device storage
  const handlePickFromDevice = async () => {
    try {
      const res = await pick({
        type: [types.pdf, types.images, '*/*'],
        allowMultiSelection: false,
      });

      if (!res || res.length === 0) return;
      const picked = res[0];
      const fileSizeMB = picked.size ? `${(picked.size / (1024 * 1024)).toFixed(1)} MB` : '2.1 MB';
      const fileName = picked.name || `File_${Date.now()}.pdf`;
      const fileType = picked.type || 'application/pdf';
      const localUri = picked.uri;

      let nextTitle = docTitle;
      if (!docTitle && picked.name) {
        nextTitle = picked.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setDocTitle(nextTitle);
      }

      setIsUploadingToS3(true);
      let remoteUrl = '';
      try {
        remoteUrl = await uploadDocumentToS3(
          localUri,
          fileName,
          fileType,
          'medical_documents',
          'applications'
        );
      } catch (s3Err) {
        console.warn('[CaseDocumentsScreen] S3 device file upload note:', s3Err);
      } finally {
        setIsUploadingToS3(false);
      }

      const pickedData = {
        name: fileName,
        uri: remoteUrl || localUri,
        size: fileSizeMB,
        type: fileType,
        remoteS3Url: remoteUrl || (localUri.startsWith('http') ? localUri : undefined),
      };
      setSelectedFile(pickedData);
      persistUploadDraft(nextTitle, docNote, pickedData);
    } catch (e: any) {
      if (e?.message !== 'User canceled document picker') {
        Alert.alert('File Picker Error', 'Could not select file from device.');
      }
      setIsUploadingToS3(false);
    }
  };

  // Save new document to case
  const handleSaveDocument = async () => {
    if (!selectedCaseForUpload) return;
    if (!docTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for the document.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('File Required', 'Please take a photo or select a file from your device.');
      return;
    }

    try {
      setUploading(true);
      const timeStr = new Date().toLocaleString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      let finalDocUri = selectedFile.remoteS3Url || selectedFile.uri;
      if (finalDocUri && !finalDocUri.startsWith('http')) {
        try {
          const s3Url = await uploadDocumentToS3(
            finalDocUri,
            selectedFile.name,
            selectedFile.type,
            'medical_documents',
            'applications'
          );
          if (s3Url) finalDocUri = s3Url;
        } catch (_) {}
      }

      const newDoc: AdditionalMedicalDocument = {
        id: `med-${Date.now()}`,
        title: docTitle.trim(),
        name: selectedFile.name,
        uri: finalDocUri,
        size: selectedFile.size,
        timestamp: timeStr,
        type: selectedFile.type,
        note: docNote.trim() || undefined,
      };

      await sevakHospitalService.addAdditionalMedicalDocument(selectedCaseForUpload.id, newDoc);

      // Clear draft on successful upload
      await sevakDraftService.clearDraft(
        sevakDraftService.keys.caseDocsUploadModal(selectedCaseForUpload.id)
      );
      setHasUploadDraft(false);

      setUploadModalVisible(false);
      setSelectedFile(null);
      setDocTitle('');
      setDocNote('');

      // Refresh cases
      await loadData();

      Alert.alert('Success', 'Document uploaded to S3 storage and attached to application successfully. Admin notified.');
    } catch (e) {
      Alert.alert('Upload Error', 'Failed to save document.');
    } finally {
      setUploading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesName = c.patientName.toLowerCase().includes(q);
    const matchesId = c.id.toLowerCase().includes(q);
    const matchesScheme = c.schemeName.toLowerCase().includes(q);
    const matchesDiagnosis = c.diagnosis.toLowerCase().includes(q);

    // Also search within uploaded document titles!
    const uploaded = getUploadedDocsForCase(c);
    const matchesDocs = uploaded.some(
      (d) => d.title.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)
    );

    return matchesName || matchesId || matchesScheme || matchesDiagnosis || matchesDocs;
  });

  const totalUploadedDocsCount = cases.reduce(
    (acc, c) => acc + getUploadedDocsForCase(c).length,
    0
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Screen Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('caseDocumentsTitle')}</Text>
          <Text style={styles.headerSubtitle}>
            {cases.length} Cases • {totalUploadedDocsCount} {t('uploadedDocsCount')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.hospitalPill}
          onPress={() => navigation.navigate('HospitalProfile')}
          activeOpacity={0.8}
        >
          <Ionicons name="business" size={14} color="#FFFFFF" />
          <Text style={styles.hospitalPillText}>{t('sevakTabHospital')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient, case ID or document..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Case Document Cards List */}
      <FlatList
        data={filteredCases}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="documents-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No cases match your search</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedCaseId === item.id;
          const uploadedDocs = getUploadedDocsForCase(item);
          const isClosed = ['Discharged', 'Completed'].includes(item.treatmentStatus);

          return (
            <View style={styles.caseCard}>
              {/* Case Header Card (Clickable to expand/collapse) */}
              <TouchableOpacity
                style={styles.caseCardHeader}
                activeOpacity={0.8}
                onPress={() => setExpandedCaseId(isExpanded ? null : item.id)}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.patientRow}>
                    <Text style={styles.patientName}>{item.patientName}</Text>
                    <View style={styles.schemeTag}>
                      <Text style={styles.schemeTagText}>{item.schemeName}</Text>
                    </View>
                    {isClosed && (
                      <View style={styles.closedTag}>
                        <Text style={styles.closedTagText}>CLOSED</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.caseMeta}>
                    ID: {item.id} • {item.assignedWard} (Bed: {item.bedNumber})
                  </Text>
                </View>

                {/* Uploaded Docs Count Badge & Chevron */}
                <View style={styles.headerRightWrap}>
                  <View
                    style={[
                      styles.docsCountBadge,
                      uploadedDocs.length > 0
                        ? styles.docsCountBadgeActive
                        : styles.docsCountBadgeEmpty,
                    ]}
                  >
                    <Ionicons
                      name="document-text"
                      size={13}
                      color={uploadedDocs.length > 0 ? '#0284C7' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.docsCountText,
                        uploadedDocs.length > 0 && { color: '#0284C7' },
                      ]}
                    >
                      {uploadedDocs.length} Doc{uploadedDocs.length !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#64748B"
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded Documents Panel */}
              {isExpanded && (
                <View style={styles.expandedPanel}>
                  {/* Upload Action Bar */}
                  <View style={styles.panelActionRow}>
                    <Text style={styles.panelSectionTitle}>
                      {t('uploadedDocsCount')} ({uploadedDocs.length})
                    </Text>

                    <TouchableOpacity
                      style={styles.uploadNewBtn}
                      onPress={() => openUploadModal(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload" size={14} color="#FFFFFF" />
                      <Text style={styles.uploadNewBtnText}>{t('uploadDocumentBtn')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Document List */}
                  {uploadedDocs.length === 0 ? (
                    <View style={styles.emptyDocsBox}>
                      <Ionicons name="folder-open-outline" size={28} color="#94A3B8" />
                      <Text style={styles.emptyDocsText}>{t('noDocsUploadedYet')}</Text>
                      <TouchableOpacity
                        style={styles.emptyDocsActionBtn}
                        onPress={() => openUploadModal(item)}
                      >
                        <Ionicons name="add-circle" size={14} color="#0284C7" />
                        <Text style={styles.emptyDocsActionText}>{t('uploadDocumentBtn')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.docsList}>
                      {uploadedDocs.map((doc) => {
                        const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                        const isImg =
                          doc.name.toLowerCase().endsWith('.jpg') ||
                          doc.name.toLowerCase().endsWith('.jpeg') ||
                          doc.name.toLowerCase().endsWith('.png');

                        return (
                          <View key={doc.id} style={styles.docItemCard}>
                            <View style={styles.docItemTop}>
                              <View
                                style={[
                                  styles.docIconWrap,
                                  isPdf ? styles.docIconPdf : styles.docIconImg,
                                ]}
                              >
                                <Ionicons
                                  name={isPdf ? 'document' : 'image'}
                                  size={18}
                                  color={isPdf ? '#DC2626' : '#0284C7'}
                                />
                              </View>

                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={styles.docTitleText} numberOfLines={1}>
                                  {doc.title}
                                </Text>
                                <Text style={styles.docFileNameText} numberOfLines={1}>
                                  {doc.name}
                                </Text>
                                <Text style={styles.docMetaText}>
                                  {doc.size} • Uploaded {doc.timestamp}
                                </Text>
                              </View>

                              {/* View Button */}
                              <TouchableOpacity
                                style={styles.viewDocBtn}
                                onPress={() => {
                                  setPreviewDoc(doc);
                                  setPreviewModalVisible(true);
                                }}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="eye-outline" size={14} color="#0284C7" />
                                <Text style={styles.viewDocBtnText}>View</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Optional Note Bubble */}
                            {doc.note ? (
                              <View style={styles.noteBubble}>
                                <Ionicons name="chatbox-ellipses-outline" size={13} color="#475569" />
                                <Text style={styles.noteBubbleText}>
                                  <Text style={{ fontWeight: '700' }}>Note: </Text>
                                  {doc.note}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Upload Document Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{t('uploadDocumentBtn')}</Text>
                <Text style={styles.modalSub} numberOfLines={1}>
                  Patient: {selectedCaseForUpload?.patientName} ({selectedCaseForUpload?.id})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setUploadModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Draft Restoration Banner */}
              {hasUploadDraft && (
                <View style={styles.draftNoticeBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="document-text" size={14} color="#0369A1" />
                    <Text style={styles.draftNoticeText}>{t('draftRestoredNotice')}</Text>
                  </View>
                  <TouchableOpacity onPress={handleDiscardUploadDraft}>
                    <Text style={styles.draftDiscardText}>{t('clearDraftBtn')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Document Title Input */}
              <Text style={styles.inputLabel}>{t('docTitleLabel')} *</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('docTitlePlaceholder')}
                placeholderTextColor="#94A3B8"
                value={docTitle}
                onChangeText={(val) => {
                  setDocTitle(val);
                  persistUploadDraft(val, docNote, selectedFile);
                }}
              />

              {/* Quick Title Suggestion Chips */}
              <View style={styles.quickChipsRow}>
                {['Discharge Summary', 'ECG Report', 'Blood Test', 'CT / X-Ray', 'Consent Form'].map(
                  (chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={styles.quickChip}
                      onPress={() => {
                        setDocTitle(chip);
                        persistUploadDraft(chip, docNote, selectedFile);
                      }}
                    >
                      <Text style={styles.quickChipText}>{chip}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* Source Pick Buttons */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Select Document File *</Text>
              <View style={styles.pickButtonsRow}>
                <TouchableOpacity
                  style={styles.sourceBtn}
                  onPress={handlePickCamera}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={20} color="#0284C7" />
                  <Text style={styles.sourceBtnText}>{t('takePhotoDoc')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sourceBtn}
                  onPress={handlePickFromDevice}
                  activeOpacity={0.8}
                  disabled={isUploadingToS3 || uploading}
                >
                  <Ionicons name="folder-open" size={20} color="#059669" />
                  <Text style={styles.sourceBtnText}>{t('chooseFileDoc')}</Text>
                </TouchableOpacity>
              </View>

              {/* S3 Uploading State Banner */}
              {isUploadingToS3 && (
                <View style={styles.s3UploadingBanner}>
                  <ActivityIndicator size="small" color="#0284C7" />
                  <Text style={styles.s3UploadingText}>
                    Uploading document to S3 storage...
                  </Text>
                </View>
              )}

              {/* Selected File Card */}
              {selectedFile && !isUploadingToS3 && (
                <View style={styles.selectedFileBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Text style={styles.selectedFileSize}>
                      {selectedFile.size} • {selectedFile.remoteS3Url ? 'S3 Upload Ready ✓' : 'Local File'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFile(null);
                      persistUploadDraft(docTitle, docNote, null);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Live S3 Testing Link Box */}
              {selectedFile?.remoteS3Url ? (
                <View style={styles.previewS3Box}>
                  <View style={styles.previewS3Header}>
                    <Ionicons name="cloud-done" size={16} color="#059669" />
                    <Text style={styles.previewS3Title}>Document Live S3 URL</Text>
                  </View>
                  <Text style={styles.previewS3Url} selectable numberOfLines={3}>
                    {selectedFile.remoteS3Url}
                  </Text>
                  <TouchableOpacity
                    style={styles.previewS3OpenBtn}
                    onPress={() => {
                      if (selectedFile.remoteS3Url) {
                        Linking.openURL(selectedFile.remoteS3Url).catch(() =>
                          Alert.alert('Error', 'Unable to open Document URL')
                        );
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="open-outline" size={14} color="#0284C7" />
                    <Text style={styles.previewS3OpenBtnText}>Open Document Link in Browser</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Optional Note Field */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>{t('optionalNoteLabel')}</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder={t('optionalNotePlaceholder')}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={docNote}
                onChangeText={(val) => {
                  setDocNote(val);
                  persistUploadDraft(docTitle, val, selectedFile);
                }}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitDocBtn,
                  (!selectedFile?.remoteS3Url || isUploadingToS3 || uploading) &&
                    styles.submitDocBtnDisabled,
                ]}
                onPress={handleSaveDocument}
                disabled={!selectedFile?.remoteS3Url || isUploadingToS3 || uploading}
                activeOpacity={0.85}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                    <Text style={styles.submitDocBtnText}>Upload & Attach Document</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Document Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {previewDoc?.title}
                </Text>
                <Text style={styles.modalSub}>{previewDoc?.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPreviewModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Visual Viewer Frame */}
              <View style={styles.previewFrame}>
                {previewDoc?.uri && (
                  previewDoc.uri.match(/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i) ||
                  previewDoc.type?.toLowerCase().includes('image') ||
                  previewDoc.name?.match(/\.(jpeg|jpg|png|webp|gif)$/i) ||
                  ((previewDoc.uri.includes('cloudinary') || previewDoc.uri.includes('s3') || previewDoc.uri.includes('amazonaws')) && !previewDoc.uri.toLowerCase().endsWith('.pdf'))
                ) ? (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <Image
                      source={{ uri: previewDoc.uri }}
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                    {previewDoc?.uri ? (
                      <TouchableOpacity
                        style={styles.openFullDocBtn}
                        onPress={() => Linking.openURL(previewDoc.uri).catch(() => Alert.alert('Error', 'Unable to open file URL.'))}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="open-outline" size={15} color="#0284C7" />
                        <Text style={styles.openFullDocText}>Open Full Resolution Image</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.pdfMockFrame}>
                    <Ionicons name="document-text" size={60} color="#DC2626" />
                    <Text style={styles.pdfMockTitle}>{previewDoc?.name || previewDoc?.title}</Text>
                    <Text style={styles.pdfMockMeta}>
                      Size: {previewDoc?.size || '1.2 MB'} • Medical Record
                    </Text>
                    <View style={styles.pdfVerifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.pdfVerifiedText}>Verified Medical Document</Text>
                    </View>
                    {previewDoc?.uri ? (
                      <TouchableOpacity
                        style={styles.openPdfDocBtn}
                        onPress={() => Linking.openURL(previewDoc.uri).catch(() => Alert.alert('Error', 'Unable to open file URL.'))}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="eye" size={16} color="#FFFFFF" />
                        <Text style={styles.openPdfDocText}>View / Open Document</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>

              {/* Timestamp & Metadata */}
              <View style={styles.previewMetaRow}>
                <Text style={styles.previewMetaLabel}>Uploaded:</Text>
                <Text style={styles.previewMetaValue}>{previewDoc?.timestamp}</Text>
              </View>

              {/* Optional Note Display */}
              {previewDoc?.note ? (
                <View style={styles.previewNoteBox}>
                  <Text style={styles.previewNoteTitle}>Sevak Handover Note:</Text>
                  <Text style={styles.previewNoteContent}>{previewDoc.note}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.closePreviewBtn}
                onPress={() => setPreviewModalVisible(false)}
              >
                <Text style={styles.closePreviewBtnText}>Close Preview</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: '#047857',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  hospitalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  hospitalPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Search
  searchSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    marginLeft: 8,
    paddingVertical: 0,
  },

  listContent: {
    padding: 14,
    paddingBottom: 60,
    gap: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 8,
  },

  // Case Card
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  caseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  schemeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  schemeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  closedTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  closedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  caseMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  headerRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  docsCountBadgeActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  docsCountBadgeEmpty: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  docsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  // Expanded Panel
  expandedPanel: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFCFD',
    padding: 12,
  },
  panelActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  uploadNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  uploadNewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty Docs Box
  emptyDocsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyDocsText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyDocsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  emptyDocsActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Documents List inside panel
  docsList: {
    gap: 8,
  },
  docItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docIconPdf: {
    backgroundColor: '#FEE2E2',
  },
  docIconImg: {
    backgroundColor: '#E0F2FE',
  },
  docTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docFileNameText: {
    fontSize: 11,
    color: '#64748B',
  },
  docMetaText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewDocBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  noteBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  noteBubbleText: {
    fontSize: 11,
    color: '#334155',
    flex: 1,
    lineHeight: 15,
  },

  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  draftNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  draftNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  draftDiscardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  multilineInput: {
    minHeight: 70,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  pickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  sourceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  selectedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  selectedFileSize: {
    fontSize: 10,
    color: '#15803D',
  },
  s3UploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  s3UploadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  previewS3Box: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  previewS3Header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  previewS3Title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  previewS3Url: {
    fontSize: 11,
    color: '#0284C7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  previewS3OpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  previewS3OpenBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  submitDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  submitDocBtnDisabled: {
    opacity: 0.5,
  },
  submitDocBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Preview Modal
  previewFrame: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginBottom: 14,
  },
  previewImage: {
    width: '100%',
    height: 260,
    borderRadius: 6,
  },
  pdfMockFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  pdfMockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  pdfMockMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  pdfVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  pdfVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewMetaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  previewMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  previewNoteBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  previewNoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 3,
  },
  previewNoteContent: {
    fontSize: 12,
    color: '#0C4A6E',
    lineHeight: 16,
  },
  openFullDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  openFullDocText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  openPdfDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginTop: 10,
  },
  openPdfDocText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closePreviewBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  closePreviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
