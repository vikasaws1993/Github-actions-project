import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  KeyboardAvoidingView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchCamera } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import { useLanguage } from '../../shared/context/LanguageContext';
import {
  sevakDraftService,
  CaseEscalationDraft,
} from '../services/sevakDraftService';
import {
  AllocatedPatientCase,
  EscalationType,
  sevakHospitalService,
} from '../services/sevakHospitalService';
import { sevakEscalationService } from '../services/sevakEscalationService';

interface CaseAdminEscalationModalProps {
  visible: boolean;
  patientCase: AllocatedPatientCase | null;
  onClose: () => void;
  onSuccess: (updatedCase: AllocatedPatientCase) => void;
}

const COMMON_SPECIALTIES = [
  'Neurosurgery (मेंदू शस्त्रक्रिया)',
  'Pediatric ICU / Lack of Beds (बालरोग अतिदक्षता / बेड कमतरता)',
  'Hemodialysis / Equipment (डायलिसिस युनिट / साधनसामग्री)',
  'Interventional Cardiology (हृदयरोग कॅथलॅब)',
  'Oncology / Chemo (कर्करोग उपचार)',
  'Trauma Vascular (रक्तवाहिनी शस्त्रक्रिया)',
  'Lack of ICU / Ventilator (अतिदक्षता / व्हेंटिलेटर अनुपलब्ध)',
];

export const CaseAdminEscalationModal: React.FC<CaseAdminEscalationModalProps> = ({
  visible,
  patientCase,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();

  const [escalationType, setEscalationType] = useState<EscalationType>('BILL_EXCEEDED');
  const [approxBillAmount, setApproxBillAmount] = useState('');
  const [requiredSpecialty, setRequiredSpecialty] = useState('');
  const [sevakNote, setSevakNote] = useState('');
  const [holdCase, setHoldCase] = useState(true);
  const [attachedDoc, setAttachedDoc] = useState<{
    name: string;
    uri: string;
    size: string;
    timestamp: string;
    type: string;
  } | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Auto-restore draft when modal opens
  useEffect(() => {
    if (visible && patientCase?.id) {
      loadEscalationDraft();
    }
  }, [visible, patientCase?.id]);

  const loadEscalationDraft = async () => {
    if (!patientCase?.id) return;
    try {
      const draft = await sevakDraftService.loadDraft<CaseEscalationDraft>(
        sevakDraftService.keys.caseEscalation(patientCase.id)
      );
      if (draft) {
        if (draft.type) setEscalationType(draft.type);
        if (draft.approxBillAmount) setApproxBillAmount(draft.approxBillAmount);
        if (draft.requiredSpecialty) setRequiredSpecialty(draft.requiredSpecialty);
        if (draft.sevakNote) setSevakNote(draft.sevakNote);
        if (typeof draft.holdCase === 'boolean') setHoldCase(draft.holdCase);
        if (draft.attachedDoc) setAttachedDoc(draft.attachedDoc);
        setDraftLoaded(true);
      } else {
        setDraftLoaded(false);
      }
    } catch {}
  };

  const persistDraft = (overrides?: Partial<CaseEscalationDraft>) => {
    if (!patientCase?.id) return;
    const draftData: CaseEscalationDraft = {
      type: overrides?.type ?? escalationType,
      approxBillAmount: overrides?.approxBillAmount ?? approxBillAmount,
      requiredSpecialty: overrides?.requiredSpecialty ?? requiredSpecialty,
      sevakNote: overrides?.sevakNote ?? sevakNote,
      holdCase: overrides?.holdCase !== undefined ? overrides.holdCase : holdCase,
      attachedDoc: overrides?.attachedDoc !== undefined ? overrides.attachedDoc : attachedDoc,
      savedAt: new Date().toISOString(),
    };
    sevakDraftService.saveDraft(sevakDraftService.keys.caseEscalation(patientCase.id), draftData);
  };

  const handleDiscardDraft = async () => {
    if (!patientCase?.id) return;
    await sevakDraftService.clearDraft(sevakDraftService.keys.caseEscalation(patientCase.id));
    setEscalationType('BILL_EXCEEDED');
    setApproxBillAmount('');
    setRequiredSpecialty('');
    setSevakNote('');
    setAttachedDoc(null);
    setUploadedFileUrl('');
    setHoldCase(true);
    setDraftLoaded(false);
    Alert.alert('Draft Discarded', 'Escalation draft has been cleared.');
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'ArogyaMitra needs camera access to capture hospital bills or referral notes for Admin.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const handlePickDocument = async (source: 'camera' | 'device') => {
    const timeStr = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      let pickedDoc: {
        name: string;
        uri: string;
        size: string;
        timestamp: string;
        type: string;
      } | null = null;

      if (source === 'camera') {
        const hasPerm = await requestCameraPermission();
        if (!hasPerm) {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }

        const res = await launchCamera({
          mediaType: 'photo',
          quality: 0.8,
          saveToPhotos: false,
        });

        if (res.didCancel || !res.assets || res.assets.length === 0) return;
        const asset = res.assets[0];
        pickedDoc = {
          name: asset.fileName || 'Supportive_Bill_Photo.jpg',
          uri: asset.uri || '',
          size: asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
          timestamp: timeStr,
          type: asset.type || 'image/jpeg',
        };
      } else {
        const res = await pick({
          type: [types.pdf, types.images, '*/*'],
          allowMultiSelection: false,
        });
        if (!res || res.length === 0) return;
        const picked = res[0];
        pickedDoc = {
          name: picked.name || 'Supportive_Document.pdf',
          uri: picked.uri,
          size: picked.size ? `${(picked.size / (1024 * 1024)).toFixed(1)} MB` : '1.5 MB',
          timestamp: timeStr,
          type: picked.type || 'application/pdf',
        };
      }

      if (pickedDoc) {
        setAttachedDoc(pickedDoc);
        persistDraft({ attachedDoc: pickedDoc });

        // Immediate S3 upload via Presigned URL
        setIsUploadingDoc(true);
        try {
          const s3Url = await sevakEscalationService.uploadEscalationDocument(pickedDoc, patientCase?.id);
          if (s3Url) {
            setUploadedFileUrl(s3Url);
          }
        } catch (uploadErr) {
          console.warn('[CaseAdminEscalationModal] S3 upload notice:', uploadErr);
        } finally {
          setIsUploadingDoc(false);
        }
      }
    } catch (e: any) {
      if (e?.message !== 'User canceled document picker') {
        Alert.alert('Error', 'Unable to select document.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!patientCase) return;

    if (!sevakNote.trim()) {
      Alert.alert(
        'Note Required',
        escalationType === 'BILL_EXCEEDED'
          ? 'Please enter an explanation of why the hospital bill exceeded the scheme ceiling.'
          : 'Please enter the clinical reason and which specific treatment/specialty is missing.'
      );
      return;
    }

    if (escalationType === 'BILL_EXCEEDED' && !approxBillAmount.trim()) {
      Alert.alert('Bill Amount Required', 'Please enter the estimated or exceeded hospital bill amount.');
      return;
    }

    if (escalationType === 'SPECIALTY_UNAVAILABLE' && !requiredSpecialty.trim()) {
      Alert.alert('Specialty Required', 'Please select or enter the required medical specialty/facility.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Create escalation directly in backend database via REST API
      const finalAttachmentUrl = uploadedFileUrl || (attachedDoc?.uri ? attachedDoc.uri : undefined);
      await sevakEscalationService.createEscalation({
        applicationId: patientCase.id,
        caseId: patientCase.id,
        reasonType: escalationType === 'BILL_EXCEEDED' ? 'bill_exceeded' : 'specialty_unavailable',
        escalationReason: escalationType === 'BILL_EXCEEDED'
          ? `Hospital Bill Exceeded (₹${approxBillAmount.trim()})`
          : `Specialty Unavailable (${requiredSpecialty.trim()})`,
        requiredSpecialty: escalationType === 'SPECIALTY_UNAVAILABLE' ? requiredSpecialty.trim() : undefined,
        estimatedBill: escalationType === 'BILL_EXCEEDED' ? approxBillAmount.trim() : undefined,
        remarks: sevakNote.trim(),
        description: sevakNote.trim(),
        attachmentName: attachedDoc?.name,
        attachmentUrl: finalAttachmentUrl,
        putOnHold: holdCase,
      });

      // 2. Sync local case model
      const updated = await sevakHospitalService.escalateCaseToAdmin(patientCase.id, {
        type: escalationType,
        approxBillAmount: escalationType === 'BILL_EXCEEDED' ? approxBillAmount.trim() : undefined,
        requiredSpecialty: escalationType === 'SPECIALTY_UNAVAILABLE' ? requiredSpecialty.trim() : undefined,
        sevakNote: sevakNote.trim(),
        supportiveDoc: attachedDoc
          ? {
              ...attachedDoc,
              uri: finalAttachmentUrl || attachedDoc.uri,
            }
          : undefined,
        holdCase,
      });

      if (updated) {
        await sevakDraftService.clearDraft(sevakDraftService.keys.caseEscalation(patientCase.id));
        setDraftLoaded(false);
        Alert.alert(
          'Request Sent to Admin',
          holdCase
            ? 'The priority escalation has been registered in the database and placed ON HOLD. District Admin has been notified.'
            : 'The priority escalation has been registered in the database. District Admin has been notified.'
        );
        onSuccess(updated);
        onClose();
        resetForm();
      }
    } catch (submitErr: any) {
      console.error('[CaseAdminEscalationModal] Submit error:', submitErr);
      Alert.alert('Error', submitErr?.message || 'Failed to send request to Admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEscalationType('BILL_EXCEEDED');
    setApproxBillAmount('');
    setRequiredSpecialty('');
    setSevakNote('');
    setAttachedDoc(null);
    setUploadedFileUrl('');
    setHoldCase(true);
  };

  if (!patientCase) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', maxHeight: '100%' }}
        >
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.headerIconBadge}>
                    <Ionicons name="flash" size={16} color="#DC2626" />
                  </View>
                  <Text style={styles.modalTitle}>{t('escalateModalTitle')}</Text>
                </View>
                <Text style={styles.modalSub}>{t('escalateModalSub')}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 60 }}
            >
            {/* Draft Restored Banner */}
            {draftLoaded && (
              <View style={styles.draftNoticeBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="document-text" size={15} color="#0284C7" />
                  <Text style={styles.draftNoticeText}>{t('draftRestoredNotice')}</Text>
                </View>
                <TouchableOpacity onPress={handleDiscardDraft}>
                  <Text style={styles.discardDraftText}>{t('clearDraftBtn')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Patient Context Banner */}
            <View style={styles.patientBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{patientCase.patientName}</Text>
                <Text style={styles.patientSub}>
                  {patientCase.id} • {patientCase.schemeName} (Limit ₹1.5L) • {patientCase.assignedWard}
                </Text>
              </View>
              <View style={styles.schemeTag}>
                <Text style={styles.schemeTagText}>{patientCase.schemeName}</Text>
              </View>
            </View>

            {/* Step 1: Select Escalation Scenario */}
            <Text style={styles.sectionLabel}>Select Escalation Reason *</Text>
            <View style={styles.scenarioGrid}>
              <TouchableOpacity
                style={[
                  styles.scenarioCard,
                  escalationType === 'BILL_EXCEEDED' && styles.scenarioCardActive,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setEscalationType('BILL_EXCEEDED');
                  persistDraft({ type: 'BILL_EXCEEDED' });
                }}
              >
                <View
                  style={[
                    styles.scenarioIconWrap,
                    { backgroundColor: escalationType === 'BILL_EXCEEDED' ? '#FEF2F2' : '#F1F5F9' },
                  ]}
                >
                  <Ionicons
                    name="cash-outline"
                    size={22}
                    color={escalationType === 'BILL_EXCEEDED' ? '#DC2626' : '#64748B'}
                  />
                </View>
                <Text
                  style={[
                    styles.scenarioTitle,
                    escalationType === 'BILL_EXCEEDED' && styles.scenarioTitleActive,
                  ]}
                >
                  {t('scenarioBillExceeded')}
                </Text>
                <Text style={styles.scenarioDesc}>
                  Hospital bill exceeds package ceiling. Request extra grant or scheme top-up.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scenarioCard,
                  escalationType === 'SPECIALTY_UNAVAILABLE' && styles.scenarioCardActive,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setEscalationType('SPECIALTY_UNAVAILABLE');
                  persistDraft({ type: 'SPECIALTY_UNAVAILABLE' });
                }}
              >
                <View
                  style={[
                    styles.scenarioIconWrap,
                    { backgroundColor: escalationType === 'SPECIALTY_UNAVAILABLE' ? '#EFF6FF' : '#F1F5F9' },
                  ]}
                >
                  <Ionicons
                    name="git-compare-outline"
                    size={22}
                    color={escalationType === 'SPECIALTY_UNAVAILABLE' ? '#0284C7' : '#64748B'}
                  />
                </View>
                <Text
                  style={[
                    styles.scenarioTitle,
                    escalationType === 'SPECIALTY_UNAVAILABLE' && styles.scenarioTitleActive,
                  ]}
                >
                  {t('scenarioSpecialtyUnavailable')}
                </Text>
                <Text style={styles.scenarioDesc}>
                  Facility lacks resources, equipment, ICU/beds or specialty. Request official transfer approval.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Inputs Based on Scenario */}
            {escalationType === 'BILL_EXCEEDED' ? (
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>{t('approxBillLabel')} *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. ₹ 1,85,000 (Exceeds ₹1,50,000 package limit)"
                  placeholderTextColor="#94A3B8"
                  value={approxBillAmount}
                  onChangeText={(val) => {
                    setApproxBillAmount(val);
                    persistDraft({ approxBillAmount: val });
                  }}
                  keyboardType="numeric"
                />
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>{t('requiredSpecialtyLabel')} *</Text>
                <View style={styles.specialtyChipsWrap}>
                  {COMMON_SPECIALTIES.map((spec) => {
                    const isSelected = requiredSpecialty === spec;
                    return (
                      <TouchableOpacity
                        key={spec}
                        style={[styles.specialtyChip, isSelected && styles.specialtyChipSelected]}
                        onPress={() => {
                          setRequiredSpecialty(spec);
                          persistDraft({ requiredSpecialty: spec });
                        }}
                      >
                        <Text
                          style={[styles.specialtyChipText, isSelected && styles.specialtyChipTextSelected]}
                        >
                          {spec}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  placeholder="Or enter specific facility / equipment needed..."
                  placeholderTextColor="#94A3B8"
                  value={requiredSpecialty}
                  onChangeText={(val) => {
                    setRequiredSpecialty(val);
                    persistDraft({ requiredSpecialty: val });
                  }}
                />
              </View>
            )}

            {/* Explanation Note */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t('escalationNoteLabel')} *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={
                  escalationType === 'BILL_EXCEEDED'
                    ? 'Explain why bill exceeded (e.g. ICU stay extended by 5 days, extra consumables required for bypass surgery)...'
                    : 'Explain clinical cause (e.g. Patient developed acute respiratory distress and requires pediatric ventilator not available in this hospital)...'
                }
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={sevakNote}
                onChangeText={(val) => {
                  setSevakNote(val);
                  persistDraft({ sevakNote: val });
                }}
              />
            </View>

            {/* Supportive Document Upload */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t('attachSupportiveDoc')}</Text>
              {attachedDoc ? (
                <View style={styles.attachedDocCard}>
                  <View style={styles.docIconCircle}>
                    <Ionicons name="document-text" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachedDocName} numberOfLines={1}>
                      {attachedDoc.name}
                    </Text>
                    <Text style={styles.attachedDocMeta}>
                      {attachedDoc.size} • Uploaded {attachedDoc.timestamp}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setAttachedDoc(null);
                      persistDraft({ attachedDoc: null });
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadButtonsRow}>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => handlePickDocument('camera')}
                  >
                    <Ionicons name="camera" size={16} color="#0284C7" />
                    <Text style={styles.uploadBtnText}>Camera Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadBtn, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}
                    onPress={() => handlePickDocument('device')}
                  >
                    <Ionicons name="document-attach" size={16} color="#475569" />
                    <Text style={[styles.uploadBtnText, { color: '#475569' }]}>Browse File</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Hold Case Option */}
            <TouchableOpacity
              style={styles.holdCaseRow}
              activeOpacity={0.8}
              onPress={() => {
                setHoldCase(!holdCase);
                persistDraft({ holdCase: !holdCase });
              }}
            >
              <View style={[styles.checkboxCircle, holdCase && styles.checkboxCircleActive]}>
                {holdCase && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.holdCaseTitle}>{t('holdCaseToggle')}</Text>
                <Text style={styles.holdCaseSub}>
                  Pauses billing, surgery billing, or discharge authorization until Admin decides.
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>{t('submitEscalationBtn')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  patientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  schemeTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  schemeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  scenarioGrid: {
    gap: 10,
    marginBottom: 14,
  },
  scenarioCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  scenarioCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5',
  },
  scenarioIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scenarioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  scenarioTitleActive: {
    color: '#DC2626',
  },
  scenarioDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  formGroup: {
    marginBottom: 14,
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  specialtyChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  specialtyChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specialtyChipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  specialtyChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  specialtyChipTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#E0F2FE',
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  attachedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  docIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedDocName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  attachedDocMeta: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 1,
  },
  holdCaseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxCircleActive: {
    backgroundColor: '#D97706',
  },
  holdCaseTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  holdCaseSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  draftNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  draftNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  discardDraftText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
