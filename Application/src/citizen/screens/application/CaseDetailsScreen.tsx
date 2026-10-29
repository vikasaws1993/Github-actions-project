import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  PermissionsAndroid,
  ActivityIndicator,
  Linking,
  Modal,
  Image,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pick, types } from '@react-native-documents/picker';
import { launchCamera } from 'react-native-image-picker';
import { applicationStore, safeFormatTime, safeFormatDate } from '../../services/applicationStore';
import { SchemeApplication, UploadedDoc } from '../../types/application.types';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { LanguageModal } from '../../../shared/components/LanguageModal';
import { uploadDocumentToS3 } from '../../../api/s3Api';

const isHospitalAssigned = (hName?: string | null): boolean => {
  if (!hName) return false;
  const clean = hName.trim();
  return clean.length > 0 && clean !== '-' && clean !== '—' && clean !== 'null' && clean !== 'undefined' && clean !== 'None' && clean !== 'Government Hospital';
};

export const CaseDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const applicationId: string = route.params?.applicationId;

  const [application, setApplication] = useState<SchemeApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Reverted Case Action State
  const [revertDoc, setRevertDoc] = useState<UploadedDoc | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [citizenRemark, setCitizenRemark] = useState('');
  const [isSubmittingRevert, setIsSubmittingRevert] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UploadedDoc | null>(null);
  const [isReopening, setIsReopening] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );
  const bottomInset = Math.max(insets.bottom, 16);

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  const fetchApplicationDetails = async (isManualRefresh: boolean = false) => {
    if (!applicationId) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await applicationStore.getApplicationById(applicationId, isManualRefresh);
      setApplication(data || null);
    } catch (err) {
      console.error('[CaseDetailsScreen] Error fetching application details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLaunchCamera = async () => {
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        if (!hasPermission) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'कॅमेरा परवानगी / Camera Permission',
              message:
                'प्रशासनाने मागितलेली कागदपत्रे फोटो काढून अपलोड करण्यासाठी कृपया कॅमेरा परवानगी द्या.\nPlease allow camera access to capture and upload requested documents.',
              buttonNeutral: 'नंतर विचारा / Later',
              buttonNegative: 'नाकारा / Cancel',
              buttonPositive: 'परवानगी द्या / Allow',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'कॅमेरा परवानगी आवश्यक / Permission Required',
              'कागदपत्राचा फोटो काढण्यासाठी कॅमेरा परवानगी आवश्यक आहे. कृपया सेटिंग्जमध्ये जाऊन परवानगी द्या.\nCamera permission is required to capture requested documents. Please enable it in App Settings.',
              [
                { text: 'रद्द करा / Cancel', style: 'cancel' },
                {
                  text: 'सेटिंग्ज उघडा / Open Settings',
                  onPress: () => {
                    if (Linking.openSettings) {
                      Linking.openSettings();
                    }
                  },
                },
              ]
            );
            return;
          }
        }
      }

      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const localUri = asset.uri || '';
      const fileName = asset.fileName || `${application?.revertDetails?.requestedDocName || 'Requested_Document'}.jpg`;
      const mimeType = asset.type || 'image/jpeg';
      const sizeStr = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB';

      const tempDoc: UploadedDoc = {
        id: `revert-cam-${Date.now()}`,
        name: fileName,
        uri: localUri,
        type: mimeType,
        size: sizeStr,
        category: (application?.revertDetails?.requestedDocType as any) || 'other',
        source: 'camera',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        uploading: true,
      };
      setRevertDoc(tempDoc);
      setIsUploadingDoc(true);

      // Direct S3 Upload
      try {
        const remoteUrl = await uploadDocumentToS3(localUri, fileName, mimeType, 'other');
        setRevertDoc({
          ...tempDoc,
          uri: remoteUrl,
          file_url: remoteUrl,
          uploading: false,
        });
      } catch (uploadErr) {
        console.warn('[CaseDetailsScreen] Camera S3 upload fallback:', uploadErr);
        setRevertDoc({
          ...tempDoc,
          uploading: false,
        });
      } finally {
        setIsUploadingDoc(false);
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Error', 'Unable to open camera.');
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await pick({
        type: [types.images, types.pdf],
      });

      if (!res || res.length === 0 || !res[0].uri) return;

      const picked = res[0];
      const localUri = (picked as any).fileCopyUri || picked.uri;
      const fileName = picked.name || `${application?.revertDetails?.requestedDocName || 'Requested_Document'}.pdf`;
      const mimeType = picked.type || (String(fileName).toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const sizeStr = picked.size ? `${(picked.size / (1024 * 1024)).toFixed(1)} MB` : '800 KB';

      const tempDoc: UploadedDoc = {
        id: `revert-file-${Date.now()}`,
        name: fileName,
        uri: localUri,
        type: mimeType,
        size: sizeStr,
        category: (application?.revertDetails?.requestedDocType as any) || 'other',
        source: 'device',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        uploading: true,
      };
      setRevertDoc(tempDoc);
      setIsUploadingDoc(true);

      // Direct S3 Upload
      try {
        const remoteUrl = await uploadDocumentToS3(localUri, fileName, mimeType, 'other');
        setRevertDoc({
          ...tempDoc,
          uri: remoteUrl,
          file_url: remoteUrl,
          uploading: false,
        });
      } catch (uploadErr) {
        console.warn('[CaseDetailsScreen] File S3 upload fallback:', uploadErr);
        setRevertDoc({
          ...tempDoc,
          uploading: false,
        });
      } finally {
        setIsUploadingDoc(false);
      }
    } catch (err) {
      console.error('File pick error:', err);
    }
  };

  const handleSubmitRevertDoc = async () => {
    if (!application || !revertDoc) {
      Alert.alert('सूचना', 'कृपया प्रथम विचारलेले कागदपत्र अपलोड करा.');
      return;
    }

    setIsSubmittingRevert(true);
    try {
      let finalRemoteUrl =
        revertDoc.file_url ||
        (revertDoc.uri && (revertDoc.uri.startsWith('http://') || revertDoc.uri.startsWith('https://'))
          ? revertDoc.uri
          : '');

      if (!finalRemoteUrl && revertDoc.uri) {
        try {
          finalRemoteUrl = await uploadDocumentToS3(
            revertDoc.uri,
            revertDoc.name,
            revertDoc.type || 'application/pdf',
            revertDoc.category || 'other'
          );
        } catch (upErr) {
          console.warn('[CaseDetailsScreen] S3 revert upload notice:', upErr);
        }
      }

      const docToSubmit: UploadedDoc = {
        ...revertDoc,
        uri: finalRemoteUrl || revertDoc.uri,
        file_url: finalRemoteUrl || revertDoc.file_url,
      };

      const updated = await applicationStore.resolveRevertedCase(
        application.caseId || application.id,
        docToSubmit,
        citizenRemark.trim()
      );

      if (updated) {
        setApplication(updated);
        setRevertDoc(null);
        setCitizenRemark('');
        Alert.alert(
          'यशस्वी (Submitted)',
          t('revertResolvedMsg') || 'कागदपत्रे यशस्वीरित्या सादर झाली आहेत. अर्ज पुनर्पडताळणीसाठी पाठवला आहे.'
        );
      }
    } catch (err) {
      console.error('[CaseDetailsScreen] Error submitting document:', err);
      Alert.alert('त्रुटी', 'कागदपत्र सादर करताना अडचण आली.');
    } finally {
      setIsSubmittingRevert(false);
    }
  };

  const formatScheduledDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('mr-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleCallSevak = (phone?: string) => {
    if (!phone) return;
    const phoneStr = String(phone).trim();
    if (phoneStr) Linking.openURL(`tel:${phoneStr}`);
  };

  const handleCallHospital = (phone?: string) => {
    if (!phone) return;
    const phoneStr = String(phone).trim();
    if (phoneStr) Linking.openURL(`tel:${phoneStr}`);
  };

  const handleWhatsAppSevak = (phone?: string, patientName?: string, caseId?: string) => {
    if (!phone) return;
    const phoneStr = String(phone);
    const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `नमस्कार, मी आरोग्य मित्र अ‍ॅपमधून संपर्क करत आहे. केस क्र. ${caseId || ''} (रुग्ण: ${patientName || ''}) बाबत मला मार्गदर्शन हवे आहे.`
    );
    Linking.openURL(`https://wa.me/${fullPhone}?text=${msg}`).catch(() => {
      Linking.openURL(`tel:${phoneStr}`);
    });
  };

  if (loading || !application) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0A5C53" />
        <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13, fontWeight: '600' }}>
          {t('loadingAppDetails') || 'Loading Application Details...'}
        </Text>
      </View>
    );
  }

  const isReverted =
    (application.status === 'REVERTED' ||
      application.status === 'DOCS_REQUIRED' ||
      application.status === 'ACTION_REQUIRED') &&
    application.revertDetails &&
    !application.revertDetails.isResolved;

  const isCompleted = application.status === 'COMPLETED' || application.status === 'CLOSED';
  const isTreatmentStarted = application.status === 'TREATMENT_STARTED' || application.status === 'APPROVED';
  const isCoordinated = application.status === 'COORDINATED' || application.status === 'SEVAK_ASSIGNED' || Boolean(application.assignedSevak && application.assignedSevak.name);
  const isDocsVerified = application.status === 'DOCS_VERIFIED' || Boolean(application.documents && application.documents.length > 0 && application.documents.every(d => d.verified));
  const isArchived = application.status === 'ARCHIVED' || application.status === 'CLOSED_EXPIRED' || Boolean(application.reopenWindow?.isExpired);
  const isRejected = (application.status === 'REJECTED' || Boolean(application.reopenWindow)) && !isArchived;
  const isInReview = application.status === 'IN_REVIEW' || application.status === 'UNDER_REVIEW';

  const isApproved = isTreatmentStarted || isCompleted;

  // 60-day Reopen calculations
  const daysRemaining = application.reopenWindow?.daysRemaining ?? 60;
  const isReopenable = isRejected && !isArchived && daysRemaining > 0;

  // Priority-based SLA calculations: Emergency = 1 Hr, Regular = 6 Hrs
  const priorityStr = (application.priority || 'REGULAR').toUpperCase();
  const isEmergency = priorityStr === 'EMERGENCY' || priorityStr === 'CRITICAL' || priorityStr === 'HIGH';
  const slaThresholdHours = isEmergency ? 1 : 6;

  const getSlaStatus = () => {
    if (isApproved || isRejected || isArchived) return null;

    let submittedTimestamp = currentTime;
    if (application.submittedAt) {
      const d = new Date(application.submittedAt).getTime();
      if (!isNaN(d)) submittedTimestamp = d;
    } else if (application.createdAt) {
      const d = new Date(application.createdAt).getTime();
      if (!isNaN(d)) submittedTimestamp = d;
    } else if (application.appliedDate) {
      const d = new Date(application.appliedDate).getTime();
      if (!isNaN(d)) submittedTimestamp = d;
    }

    const intervalMs = slaThresholdHours * 3600 * 1000;
    const lastReminderTimestamp = application.lastReminderSentAt
      ? new Date(application.lastReminderSentAt).getTime()
      : null;

    let canNotify = false;
    let isCooldownActive = false;
    let remainingMs = 0;
    let elapsedHours = 0;
    let isSlaBreached = false;

    if (lastReminderTimestamp) {
      const elapsedSinceReminderMs = Math.max(0, currentTime - lastReminderTimestamp);
      elapsedHours = elapsedSinceReminderMs / (1000 * 60 * 60);
      isCooldownActive = elapsedSinceReminderMs < intervalMs;
      remainingMs = Math.max(0, intervalMs - elapsedSinceReminderMs);
      canNotify = !isCooldownActive;
      isSlaBreached = true; // Alert card active
    } else {
      const elapsedSinceSubmissionMs = Math.max(0, currentTime - submittedTimestamp);
      elapsedHours = elapsedSinceSubmissionMs / (1000 * 60 * 60);
      isSlaBreached = elapsedSinceSubmissionMs >= intervalMs;
      remainingMs = Math.max(0, intervalMs - elapsedSinceSubmissionMs);
      isCooldownActive = !isSlaBreached;
      canNotify = isSlaBreached;
    }

    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

    const pad = (num: number) => String(num).padStart(2, '0');
    let formattedRemaining = '';
    const hUnit = t('hoursShort') || 'तास';
    const mUnit = t('minsShort') || 'मि.';
    const sUnit = t('secsShort') || 'से.';
    if (remainingHours > 0) {
      formattedRemaining = `${remainingHours} ${hUnit} ${pad(remainingMinutes)} ${mUnit} ${pad(remainingSeconds)} ${sUnit}`;
    } else if (remainingMinutes > 0) {
      formattedRemaining = `${remainingMinutes} ${mUnit} ${pad(remainingSeconds)} ${sUnit}`;
    } else {
      formattedRemaining = `${remainingSeconds} ${sUnit}`;
    }

    return {
      priorityStr,
      isEmergency,
      slaThresholdHours,
      elapsedHours,
      isSlaBreached,
      canNotify,
      isCooldownActive,
      remainingMs,
      formattedRemaining,
      lastReminderSentAt: application.lastReminderSentAt,
      hasSentReminderBefore: Boolean(lastReminderTimestamp),
    };
  };

  const slaInfo = getSlaStatus();

  const handleSendReminderPrompt = () => {
    if (!application || isSendingReminder) return;

    const isAgain = Boolean(slaInfo?.hasSentReminderBefore);
    Alert.alert(
      isAgain ? 'प्रशासकास पुन्हा स्मरणपत्र पाठवा (Send Reminder Again)' : 'प्रशासकास स्मरणपत्र पाठवा (Send Reminder)',
      `हा अर्ज ${isEmergency ? 'तातडीचा (Emergency - 1 Hr SLA)' : 'नियमित (Regular - 6 Hr SLA)'} असल्याने प्रशासकीय डॅशबोर्डवर तात्काळ 'Action Required' अलर्ट पाठवला जाईल.\n\nतुम्हाला स्मरणपत्र पाठवायचे आहे का?`,
      [
        { text: 'रद्द करा (Cancel)', style: 'cancel' },
        {
          text: 'होय, पाठवा (Send Now)',
          style: 'default',
          onPress: async () => {
            setIsSendingReminder(true);
            try {
              const res = await applicationStore.sendAdminReminder(
                application.caseId || application.id
              );
              Alert.alert('यशस्वी (Reminder Sent)', res.message);
              // Optimistically update local application state
              setApplication((prev) =>
                prev
                  ? {
                      ...prev,
                      lastReminderSentAt: new Date().toISOString(),
                      reminderCount: (prev.reminderCount || 0) + 1,
                    }
                  : prev
              );
              fetchApplicationDetails(true);
            } catch (err) {
              Alert.alert('त्रुटी', 'स्मरणपत्र पाठवताना अडचण आली.');
            } finally {
              setIsSendingReminder(false);
            }
          },
        },
      ]
    );
  };

  const handleReopenApplication = () => {
    if (!application) return;

    Alert.alert(
      'अर्ज फेरविचार विनंती (Request Reopen)',
      `सदर अर्जासाठी प्रशासनाकडे फेरविचार विनंती पाठवली जाईल.\n(६० दिवसांच्या मुदतीपैकी ${daysRemaining} दिवस शिल्लक आहेत).\n\nप्रशासनाने मान्यता दिल्यावरच अर्ज पुन्हा उघडला जाईल. आपण विनंती पाठवू इच्छिता का?`,
      [
        { text: 'रद्द करा (Cancel)', style: 'cancel' },
        {
          text: 'होय, विनंती पाठवा (Send Request)',
          style: 'default',
          onPress: async () => {
            setIsReopening(true);
            try {
              const res = await applicationStore.requestCaseReopen(
                application.caseId || application.id,
                'नागरिकाकडून ६० दिवसांच्या मुदतीत अर्ज फेरविचार विनंती दाखल करण्यात आली.'
              );
              Alert.alert('विनंती पाठवली (Request Sent)', res.message);
              fetchApplicationDetails(true);
            } catch (err: any) {
              Alert.alert('त्रुटी (Error)', 'अर्ज फेरविचार विनंती पाठवताना अडचण आली.');
            } finally {
              setIsReopening(false);
            }
          },
        },
      ]
    );
  };

  // 4 Progress Steps
  const progressSteps = [
    { title: t('stepSubmitted') || 'अर्ज सादर', key: 'submitted' },
    { title: t('stepDocuments') || 'कागदपत्रे', key: 'docs' },
    { title: t('stepInspection') || 'सेवक तपासणी', key: 'inspection' },
    { title: isArchived ? (t('statusArchived') || 'दफ्तरबंद') : isCompleted ? (t('statusCompleted') || 'मंजूर व पूर्ण') : (t('statusTreatmentStarted') || 'उपचार सुरू'), key: 'approval' },
  ];

  const getActiveStepIndex = () => {
    if (isArchived) return 3;
    if (isCompleted) return 4;
    if (isTreatmentStarted) return 3;
    if (isCoordinated) return 2;
    if (isDocsVerified) return 1;
    if (isReverted) return 1; // Document stage alert
    if (isInReview) return 1; // Inspection/review stage
    if (isRejected) return 3;
    return 0; // Submitted
  };

  const currentStepIdx = getActiveStepIndex();

  const genderLabel =
    application.gender === 'male' || application.gender === 'Male'
      ? t('genderMale') || 'पुरुष'
      : application.gender === 'female' || application.gender === 'Female'
      ? t('genderFemale') || 'महिला'
      : t('genderOther') || 'इतर';

  const schemeKey = `${application.schemeId || ''} ${application.schemeName || ''}`.toLowerCase();
  const isPmjayScheme = schemeKey.includes('pmjay') || schemeKey.includes('ayushman') || schemeKey.includes('आयुष्मान');
  const isMjpjayScheme = schemeKey.includes('mjpjay') || schemeKey.includes('jyotirao') || schemeKey.includes('jyotiba') || schemeKey.includes('phule') || schemeKey.includes('फुले');

  const localizedSchemeName = isPmjayScheme
    ? t('schemePmjay')
    : isMjpjayScheme
    ? t('schemeMjpjay')
    : application.schemeName || t('govtSchemeLabel') || 'शासकीय आरोग्य योजना';

  const headerSchemeTagText = isPmjayScheme
    ? 'PM-JAY'
    : isMjpjayScheme
    ? 'MJPJAY'
    : (t('govtSchemeTag') || 'शासकीय योजना');

  // Compute status presentation
  const scheduledVisitDate =
    application.admissionDate ||
    application.visitDate ||
    application.preferredAdmissionDate ||
    (application as any).active_assignment?.admission_date;
  const formattedVisitDate = formatScheduledDate(scheduledVisitDate);

  let statusTitle = t('statusInReviewTitle') || 'अर्ज पडताळणी सुरू आहे';
  let statusSub = t('statusInReviewSub') || 'तुमचा अर्ज तपासला जात आहे.';
  let statusIcon = 'time';
  let statusColor = '#2563EB';
  let statusCardStyle = styles.statusCardInfo;

  if (isReverted) {
    statusTitle = t('statusRevertTitle') || 'कागदपत्र पूर्तता आवश्यक';
    statusSub = t('statusRevertSub') || 'प्रशासनाकडून कागदपत्रांची मागणी करण्यात आली आहे.';
    statusIcon = 'alert-circle';
    statusColor = '#DC2626';
    statusCardStyle = styles.statusCardAlert;
  } else if (isCompleted) {
    statusTitle = `${t('statusCompleted') || 'योजना लाभ व उपचार पूर्ण'} 🎉`;
    statusSub = application.sanctionedAmount
      ? `${t('sanctionedAmountLabel') || 'मंजूर रक्कम:'} ${application.sanctionedAmount} (${t('cashlessTreatment') || 'कॅशलेस उपचार'})`
      : (t('statusApprovedSub') || 'शासकीय योजनेचा लाभ पूर्ण मिळाला आहे.');
    statusIcon = 'checkmark-circle';
    statusColor = '#16A34A';
    statusCardStyle = styles.statusCardSuccess;
  } else if (isTreatmentStarted) {
    statusTitle = `${t('statusTreatmentStarted') || 'उपचार सुरू'} 🏥`;
    statusSub = isHospitalAssigned(application.hospitalName)
      ? `${application.hospitalName} - ${t('cashlessTreatment') || 'कॅशलेस उपचार'}`
      : (t('cashlessTreatment') || 'शासकीय योजनेअंतर्गत कॅशलेस उपचार सुरू आहेत.');
    statusIcon = 'medical';
    statusColor = '#0A5C53';
    statusCardStyle = styles.statusCardSuccess;
  } else if (isCoordinated) {
    statusTitle = `${t('statusCoordinated') || 'आरोग्य सेवक समन्वय'} 👤`;
    statusSub = isHospitalAssigned(application.hospitalName)
      ? `रुग्णालय: ${application.hospitalName}${application.assignedSevak?.name ? ` | सेवक: ${application.assignedSevak.name}` : ''}${formattedVisitDate ? ` | भेट: ${formattedVisitDate}` : ''}`
      : application.assignedSevak?.name
      ? `आरोग्य सेवक (${application.assignedSevak.name}) समन्वयासाठी उपलब्ध आहेत.`
      : (t('contactSevakSub') || 'हॉस्पिटल व आरोग्य मित्र सहाय्य उपलब्ध आहे.');
    statusIcon = 'people';
    statusColor = '#0D9488';
    statusCardStyle = styles.statusCardSuccess;
  } else if (isDocsVerified) {
    statusTitle = `${t('statusDocsVerified') || 'कागदपत्रे पडताळली'} ✓`;
    statusSub = t('statusDocsVerifiedSub') || 'सर्व कागदपत्रे प्रशासनाने मंजूर केली आहेत. लवकरच आरोग्य सेवक संपर्क करतील.';
    statusIcon = 'shield-checkmark';
    statusColor = '#10B981';
    statusCardStyle = styles.statusCardSuccess;
  } else if (isRejected) {
    statusTitle = `${t('statusRejected') || 'अर्ज नामंजूर'} (${daysRemaining} ${t('days') || 'दिवस'})`;
    statusSub = application.remarks || application.rejectionReason || (t('rejectionDefaultReason') || 'सदर अर्ज शासकीय योजनेच्या निकषात बसत नसल्यामुळे नाकारला.');
    statusIcon = 'close-circle';
    statusColor = '#BE123C';
    statusCardStyle = styles.statusCardDanger;
  } else if (isArchived) {
    statusTitle = t('statusArchived') || 'अर्ज दफ्तरबंद / कालबाह्य (Archived)';
    statusSub = t('statusArchivedSub') || '६० दिवसांची फेरविचार मुदत संपल्यामुळे हा अर्ज कायमस्वरूपी दफ्तरबंद करण्यात आला आहे.';
    statusIcon = 'archive';
    statusColor = '#64748B';
    statusCardStyle = styles.statusCardMuted;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>{t('caseDetailsTitle') || 'अर्जाचा तपशील'}</Text>
          <Text style={styles.headerCaseId}>
            {t('caseId') || 'केस क्र.'}: {application.caseId || application.id}
          </Text>
        </View>

        {/* Language Selection Dropdown Button */}
        <TouchableOpacity
          style={styles.langPill}
          onPress={() => setShowLanguageModal(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Select Language"
        >
          <Ionicons name="globe-outline" size={13} color="#0A5C53" style={{ marginRight: 3 }} />
          <Text style={styles.langText}>
            {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#0A5C53" style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        <View style={styles.schemeTag}>
          <Text style={styles.schemeTagText} numberOfLines={1}>
            {headerSchemeTagText}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchApplicationDetails(true)}
            colors={['#0A5C53']}
            tintColor="#0A5C53"
          />
        }
      >
        {/* Dynamic Status Card Banner */}
        <View style={[styles.statusCard, statusCardStyle]}>
          <View style={styles.statusRow}>
            <Ionicons
              name={statusIcon as any}
              size={26}
              color={statusColor}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.statusTitle, { color: statusColor }]}>
                {statusTitle}
              </Text>
              <Text style={styles.statusSub}>
                {statusSub}
              </Text>
            </View>
          </View>
        </View>

        {/* ═════════ PRIORITY SLA ESCALATION / NOTIFY ADMIN MODULE ═════════ */}
        {slaInfo && (
          slaInfo.canNotify ? (
            <View style={[styles.slaContainer, styles.slaContainerBreached]}>
              <View style={styles.slaHeaderRow}>
                <View
                  style={[
                    styles.slaPriorityPill,
                    slaInfo.isEmergency ? styles.slaPillCritical : styles.slaPillHigh,
                  ]}
                >
                  <Ionicons
                    name={slaInfo.isEmergency ? 'flame' : 'timer-outline'}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.slaPriorityPillText}>
                    {slaInfo.isEmergency ? t('priorityEmergency') : t('priorityRegular')}
                  </Text>
                </View>

                <Text style={styles.slaLimitText}>
                  SLA: {slaInfo.slaThresholdHours} {slaInfo.slaThresholdHours === 1 ? t('slaLimitSingleText') : t('slaLimitText')}
                </Text>
              </View>

              <View style={styles.slaBreachedContent}>
                <Text style={styles.slaBreachedNotice}>
                  {(slaInfo.hasSentReminderBefore
                    ? t('slaReminderSentNotice') || ''
                    : t('slaReminderPendingNotice') || ''
                  )
                    .replace('{hours} hrs', slaInfo.slaThresholdHours === 1 ? '1 hr' : `${slaInfo.slaThresholdHours} hrs`)
                    .replace('{hours}', String(slaInfo.slaThresholdHours))}
                </Text>

                <TouchableOpacity
                  style={styles.notifyAdminBtn}
                  activeOpacity={0.85}
                  disabled={isSendingReminder}
                  onPress={handleSendReminderPrompt}
                >
                  {isSendingReminder ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  ) : (
                    <Ionicons name="notifications" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.notifyAdminBtnText}>
                    {isSendingReminder
                      ? t('sendingReminder')
                      : slaInfo.hasSentReminderBefore
                      ? t('notifyAdminAgainBtn')
                      : t('notifyAdminNowBtn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.slaSingleLineBanner}>
              <Ionicons
                name={slaInfo.hasSentReminderBefore ? 'checkmark-circle' : 'timer-outline'}
                size={16}
                color={slaInfo.hasSentReminderBefore ? '#047857' : '#0A5C53'}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.slaSingleLineText}>
                {slaInfo.hasSentReminderBefore
                  ? t('slaReminderSentSingle')
                  : (t('slaReminderAvailableSingle') || '')
                      .replace('{hours} hrs', slaInfo.slaThresholdHours === 1 ? '1 hr' : `${slaInfo.slaThresholdHours} hrs`)
                      .replace('{hours}', String(slaInfo.slaThresholdHours))}
                <Text style={styles.slaCountdownHighlight}>{slaInfo.formattedRemaining}</Text>
                {slaInfo.hasSentReminderBefore ? t('slaWillBeActiveSuffix') : t('slaWillBeAvailableSuffix')}
              </Text>
            </View>
          )
        )}

        {/* Clean 4-Step Progress Tracker */}
        <View style={styles.progressCard}>
          <Text style={styles.cardSectionTitle}>{t('progressTitle') || 'अर्जाची सद्यस्थिती (प्रगती)'}</Text>

          <View style={styles.stepperContainer}>
            {progressSteps.map((step, idx) => {
              const isStep1Done = true;
              const isStep2Done = isDocsVerified || isCoordinated || isTreatmentStarted || isCompleted;
              const isStep3Done = isCoordinated || isTreatmentStarted || isCompleted;
              const isStep4Done = isCompleted;

              const isPassed = (idx === 0 && isStep1Done) ||
                               (idx === 1 && isStep2Done) ||
                               (idx === 2 && isStep3Done) ||
                               (idx === 3 && isStep4Done);

              const isCurrent = idx === currentStepIdx;
              const isAlert = isCurrent && (isReverted || isRejected);

              let circleColor = '#E2E8F0';
              let iconColor = '#94A3B8';
              let iconName = 'ellipse';

              if (isPassed) {
                circleColor = '#10B981';
                iconColor = '#FFFFFF';
                iconName = 'checkmark';
              } else if (isAlert) {
                circleColor = '#EF4444';
                iconColor = '#FFFFFF';
                iconName = isRejected ? 'close' : 'alert';
              } else if (isCurrent) {
                circleColor = '#0A5C53';
                iconColor = '#FFFFFF';
                iconName = idx === 3 && isTreatmentStarted ? 'medical' : 'time';
              }

              return (
                <React.Fragment key={step.key}>
                  <View style={styles.stepNode}>
                    <View style={[styles.stepCircle, { backgroundColor: circleColor }]}>
                      {iconName === 'ellipse' ? (
                        <Text style={styles.stepNum} maxFontSizeMultiplier={1.15}>{idx + 1}</Text>
                      ) : (
                        <Ionicons name={iconName as any} size={14} color={iconColor} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        (isCurrent || isPassed) && styles.stepLabelActive,
                        isAlert && { color: '#DC2626' },
                      ]}
                      maxFontSizeMultiplier={1.15}
                      numberOfLines={2}
                    >
                      {step.title}
                    </Text>
                  </View>
                  {idx < progressSteps.length - 1 && (
                    <View
                      style={[
                        styles.stepConnector,
                        ((idx === 0 && isStep1Done) || (idx === 1 && isStep2Done) || (idx === 2 && isStep3Done)) && styles.stepConnectorPassed,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* ═════════ REVERT ACTION (DOCUMENT REQUEST RE-UPLOAD FLOW) ═════════ */}
        {isReverted && application.revertDetails && (
          <View style={styles.revertBox}>
            <View style={styles.revertHeader}>
              <Ionicons name="document-attach" size={22} color="#DC2626" />
              <Text style={styles.revertHeaderTitle}>{t('adminNoticeTitle') || 'प्रशासकाची सूचना'}</Text>
            </View>

            <Text style={styles.revertReasonText}>"{application.revertDetails.reason}"</Text>

            <View style={styles.requestedDocPill}>
              <Text style={styles.requestedDocLabel}>{t('requestedDocLabel') || 'मागितलेले कागदपत्र'}:</Text>
              <Text style={styles.requestedDocValue}>
                {application.revertDetails.requestedDocName}
              </Text>
            </View>

            {/* Document Upload Module */}
            {revertDoc ? (
              <View style={styles.attachedDocRow}>
                {isUploadingDoc ? (
                  <ActivityIndicator size="small" color="#0A5C53" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                )}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.attachedDocName} numberOfLines={1}>
                    {revertDoc.name}
                  </Text>
                  <Text style={styles.attachedDocMeta}>
                    {isUploadingDoc ? 'Uploading to S3...' : `${revertDoc.size} • S3 Upload Ready`}
                  </Text>
                </View>

                {!isUploadingDoc && (
                  <TouchableOpacity
                    style={styles.removeDocBtn}
                    onPress={() => setRevertDoc(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.uploadButtonGroup}>
                <TouchableOpacity
                  style={styles.uploadBtnHalf}
                  activeOpacity={0.8}
                  onPress={handleLaunchCamera}
                >
                  <Ionicons name="camera" size={20} color="#0A5C53" />
                  <Text style={styles.uploadBtnHalfText}>{t('takePhotoBtn') || 'फोटो काढा'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadBtnHalf}
                  activeOpacity={0.8}
                  onPress={handlePickDocument}
                >
                  <Ionicons name="folder-open" size={20} color="#0A5C53" />
                  <Text style={styles.uploadBtnHalfText}>{t('chooseFileBtn') || 'फाईल निवडा'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Optional Citizen Remark Input */}
            <TextInput
              style={styles.remarkInput}
              placeholder={t('citizenRemarkPlaceholder') || 'तुमचा अभिप्राय / स्पष्टीकरण (उदा. नवीन स्पष्ट प्रत जोडली आहे...)'}
              placeholderTextColor="#94A3B8"
              value={citizenRemark}
              onChangeText={setCitizenRemark}
              multiline
            />

            {/* Submit Revert Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!revertDoc || isSubmittingRevert || isUploadingDoc) && styles.submitBtnDisabled,
              ]}
              disabled={!revertDoc || isSubmittingRevert || isUploadingDoc}
              activeOpacity={0.88}
              onPress={handleSubmitRevertDoc}
            >
              {isSubmittingRevert ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Submitting to Admin...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>{t('submitRevertBtn') || 'कागदपत्र सादर करा'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ═════════ 60-DAY REOPEN WINDOW & REJECTION BANNER ═════════ */}
        {isRejected && (
          <View style={[styles.revertBox, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
            <View style={styles.revertHeader}>
              <Ionicons name="close-circle" size={22} color="#DC2626" />
              <Text style={[styles.revertHeaderTitle, { color: '#991B1B' }]}>
                {t('rejectionNoticeTitle') || 'अर्ज नामंजूर'}
              </Text>
            </View>

            <Text style={[styles.revertReasonText, { color: '#B91C1C', fontWeight: '700' }]}>
              "{application.remarks || application.rejectionReason || 'सदर अर्ज कोणत्याही शासकीय आरोग्य योजनेच्या निकषात बसत नाही.'}"
            </Text>

            {/* 60-Day Reopen Timer Pill */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFF1F2',
                borderWidth: 1,
                borderColor: '#FDA4AF',
                paddingVertical: 9,
                paddingHorizontal: 12,
                borderRadius: 8,
                marginTop: 10,
                gap: 8,
              }}
            >
              <Ionicons name="time" size={20} color="#E11D48" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#9F1239' }}>
                  ⏳ {t('reopenWindowNotice') || 'फेरविचार मुदत'}: {daysRemaining} {t('days') || 'दिवस'} {t('filterSeen') ? 'शिल्लक' : 'remaining'}
                </Text>
                <Text style={{ fontSize: 11, color: '#BE123C', marginTop: 1 }}>
                  {t('reopenWindowSub') || '६० दिवसांच्या आत आपण या अर्जासाठी प्रशासकाकडे फेरविचार विनंती पाठवू शकता.'}
                </Text>
              </View>
            </View>

            {/* Reopen Request Status / Action Button */}
            {application.reopenRequested ? (
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  borderWidth: 1.5,
                  borderColor: '#93C5FD',
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Ionicons name="checkmark-done-circle" size={24} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF' }}>
                    ✓ {t('reopenRequestPending') || 'फेरविचार विनंती पाठवली आहे'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#1E3A8A', marginTop: 2, lineHeight: 16 }}>
                    {t('reopenRequestPendingSub') || 'आपली फेरविचार विनंती प्रशासकीय मंजुरीसाठी प्रलंबित आहे. प्रशासकीय पडताळणीनंतर अर्ज पुन्हा सुरू केला जाईल.'}
                  </Text>
                </View>
              </View>
            ) : isReopenable ? (
              <TouchableOpacity
                style={{
                  backgroundColor: '#0A5C53',
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 12,
                  gap: 8,
                  shadowColor: '#0A5C53',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 2,
                }}
                activeOpacity={0.85}
                disabled={isReopening}
                onPress={handleReopenApplication}
              >
                {isReopening ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh-circle" size={20} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                      🔄 {t('requestCaseReopenBtn') || 'अर्ज फेरविचार विनंती पाठवा'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' }}>
              <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
                💡 <Text style={{ fontWeight: '700', color: '#0F172A' }}>{t('citizenNoticeLabel') || 'नागरिकांसाठी सूचना'}:</Text> {t('citizenNoticeArchivedInfo') || '६० दिवस पूर्ण झाल्यानंतर हा अर्ज कायमचा दफ्तरबंद होईल. अर्ज फेरविचार विनंती पाठवल्यानंतर केवळ प्रशासकच अर्ज पुन्हा उघडू शकतात.'}
              </Text>
            </View>
          </View>
        )}

        {/* ═════════ ARCHIVED (60-DAY EXPIRED) BANNER ═════════ */}
        {isArchived && (
          <View style={[styles.revertBox, { borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }]}>
            <View style={styles.revertHeader}>
              <Ionicons name="archive" size={22} color="#64748B" />
              <Text style={[styles.revertHeaderTitle, { color: '#334155' }]}>
                {t('archivedTitle') || 'अर्ज दफ्तरबंद'}
              </Text>
            </View>

            <Text style={[styles.revertReasonText, { color: '#475569' }]}>
              {t('statusArchivedSub') || 'सदर अर्जाची ६० दिवसांची फेरविचार मुदत संपलेली आहे. हा अर्ज कायमस्वरूपी दफ्तरबंद करण्यात आला आहे.'}
            </Text>

            <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 18 }}>
                ℹ️ योजनेचा लाभ घेण्यासाठी कृपया आवश्यक कागदपत्रांसह <Text style={{ fontWeight: '700', color: '#0A5C53' }}>नवीन अर्ज सादर करा</Text>.
              </Text>
            </View>
          </View>
        )}

        {/* ═════════ PATIENT & SCHEME DETAILS CARD ═════════ */}
        <View style={styles.infoCard}>
          <Text style={styles.cardSectionTitle}>{t('patientAndSchemeTitle') || 'रुग्ण व योजना माहिती'}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('reviewName') || 'रुग्णाचे नाव'}:</Text>
            <Text style={styles.infoValue}>{application.patientName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('ageGenderLabel') || 'वय / लिंग'}:</Text>
            <Text style={styles.infoValue}>
              {application.age ? `${application.age} ${t('years') || 'वर्षे'} ` : ''}({genderLabel})
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('schemeLabel') || 'योजना'}:</Text>
            <Text style={[styles.infoValue, { color: '#0A5C53', fontWeight: '800' }]}>
              {localizedSchemeName}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('priorityLabel') || 'प्राधान्य'}:</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isEmergency ? '#FEF2F2' : '#F0FDF4',
                borderColor: isEmergency ? '#FECACA' : '#BBF7D0',
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                gap: 5,
              }}
            >
              <Ionicons
                name={isEmergency ? 'flame' : 'shield-checkmark'}
                size={13}
                color={isEmergency ? '#DC2626' : '#16A34A'}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: isEmergency ? '#DC2626' : '#16A34A',
                }}
              >
                {isEmergency ? t('priorityEmergency') : t('priorityRegular')}
              </Text>
            </View>
          </View>

          {application.sanctionedAmount ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>मंजूर अनुदान:</Text>
              <Text style={[styles.infoValue, { color: '#15803D', fontWeight: '800' }]}>
                {application.sanctionedAmount}
              </Text>
            </View>
          ) : null}

          {isHospitalAssigned(application.hospitalName) ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('hospitalLabel') || 'रुग्णालय'}:</Text>
              <Text style={styles.infoValue}>{application.hospitalName}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('mobileLabel') || 'मोबाईल'}:</Text>
            <Text style={styles.infoValue}>{application.contactMobile}</Text>
          </View>

          {application.address ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('reviewAddress') || 'पत्ता'}:</Text>
              <Text style={[styles.infoValue, { textAlign: 'right', flex: 1.5 }]}>
                {application.address}
              </Text>
            </View>
          ) : null}

          {application.medicalCauseNote ? (
            <View style={[styles.infoRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
              <Text style={styles.infoLabel}>{t('medicalCauseNote') || 'आजाराचे कारण / टीप:'}</Text>
              <Text style={[styles.infoValue, { textAlign: 'left', color: '#334155' }]}>
                {application.medicalCauseNote}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ═════════ ASSIGNED HOSPITAL & SCHEDULED VISIT CARD ═════════ */}
        {isHospitalAssigned(application.hospitalName) && (
          <View style={styles.hospitalCard}>
            <View style={styles.hospitalHeader}>
              <View style={styles.hospitalIconBox}>
                <Ionicons name="business" size={22} color="#0A5C53" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.hospitalName} numberOfLines={2}>
                    {application.hospitalName}
                  </Text>
                  <View style={styles.hospitalTag}>
                    <Text style={styles.hospitalTagText}>{t('hospitalEmpanelled' as any) || 'अंगीकृत रुग्णालय'}</Text>
                  </View>
                </View>
                {application.hospitalCity || application.hospitalDistrict ? (
                  <Text style={styles.hospitalLocation}>
                    📍 {[application.hospitalCity, application.hospitalDistrict].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
              </View>
            </View>

            {application.hospitalAddress ? (
              <View style={styles.hospitalAddressBox}>
                <Ionicons name="location-outline" size={15} color="#475569" style={{ marginTop: 2 }} />
                <Text style={styles.hospitalAddressText}>
                  {application.hospitalAddress}
                </Text>
              </View>
            ) : null}

            {/* Scheduled Visit / Admission Date Banner */}
            {Boolean(formattedVisitDate) && (
              <View style={styles.visitDateBanner}>
                <Ionicons name="calendar" size={18} color="#047857" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.visitDateLabel}>{t('scheduledVisitDateLabel') || 'रुग्णालय भेट / तपासणी तारीख (Scheduled Visit Date):'}</Text>
                  <Text style={styles.visitDateValue}>{formattedVisitDate}</Text>
                </View>
              </View>
            )}

            {/* Hospital Contact Action */}
            {application.hospitalPhone ? (
              <View style={styles.hospitalActionRow}>
                <TouchableOpacity
                  style={styles.hospitalCallBtn}
                  activeOpacity={0.8}
                  onPress={() => handleCallHospital(application.hospitalPhone)}
                >
                  <Ionicons name="call" size={15} color="#0A5C53" style={{ marginRight: 6 }} />
                  <Text style={styles.hospitalCallBtnText}>{t('callHospitalBtn')} ({application.hospitalPhone})</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* ═════════ ASSIGNED AROGYA SEVAK CARD ═════════ */}
        {application.assignedSevak && (
          <View style={styles.sevakCard}>
            <View style={styles.sevakHeader}>
              <View style={styles.sevakIconBox}>
                <Ionicons name="person" size={20} color="#0A5C53" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sevakName}>{application.assignedSevak.name}</Text>
                <Text style={styles.sevakRole}>
                  {application.assignedSevak.role || t('sevakSupportRole') || 'मदतीसाठी आरोग्य मित्र'}
                </Text>
              </View>
            </View>

            <View style={styles.sevakActionRow}>
              <TouchableOpacity
                style={styles.sevakCallBtn}
                activeOpacity={0.8}
                onPress={() => handleCallSevak(application.assignedSevak?.phone)}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.sevakCallBtnText}>{t('callSevakPhoneBtn')} ({application.assignedSevak.phone})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sevakWhatsAppBtn}
                activeOpacity={0.8}
                onPress={() =>
                  handleWhatsAppSevak(
                    application.assignedSevak?.phone,
                    application.patientName,
                    application.caseId || application.id
                  )
                }
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═════════ ATTACHED DOCUMENTS LIST ═════════ */}
        <View style={styles.docsCard}>
          <Text style={styles.cardSectionTitle}>
            {t('attachedDocsTitle') || 'जोडलेली कागदपत्रे'} ({application.documents?.length || 0})
          </Text>

          {application.documents && application.documents.length > 0 ? (
            application.documents.map((doc, idx) => {
              const docUrl = doc.file_url || doc.uri || '';
              const docName = String(doc.name || (doc as any).file_name || 'Document');
              const isPdf = docName.toLowerCase().endsWith('.pdf') || String(doc.type || '').includes('pdf') || String(docUrl).toLowerCase().endsWith('.pdf');

              return (
                <View key={doc.id || idx} style={styles.docItemCard}>
                  <TouchableOpacity
                    style={styles.docItemLeft}
                    activeOpacity={0.75}
                    onPress={() => setPreviewDoc(doc)}
                  >
                    <View style={styles.docIconBox}>
                      <Ionicons
                        name={isPdf ? 'document-text' : 'image'}
                        size={20}
                        color="#0A5C53"
                      />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.docItemName} numberOfLines={1}>
                        {docName}
                      </Text>
                      <Text style={styles.docItemSize}>{doc.size || 'Attached'}</Text>
                    </View>
                    <Ionicons name="eye-outline" size={18} color="#0A5C53" />
                  </TouchableOpacity>

                  {/* Document Link Row for Live Verification */}
                  {docUrl ? (
                    <TouchableOpacity
                      style={styles.docCloudRow}
                      activeOpacity={0.8}
                      onPress={() => Linking.openURL(docUrl)}
                    >
                      <Ionicons name="cloud-done" size={13} color="#059669" />
                      <Text style={styles.docCloudUrl} numberOfLines={1} ellipsizeMode="middle">
                        {docUrl}
                      </Text>
                      <View style={styles.docOpenTag}>
                        <Text style={styles.docOpenTagText}>Open</Text>
                        <Ionicons name="open-outline" size={10} color="#15803D" />
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
              {t('noDocumentsAttached') || 'कोणतेही कागदपत्र जोडलेले नाही.'}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* DOCUMENT PREVIEW MODAL */}
      <Modal
        visible={Boolean(previewDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPreviewDoc(null)}
        >
          <View style={styles.previewModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitleText} numberOfLines={1}>
                  {previewDoc?.name}
                </Text>
                <Text style={styles.previewDocNameSub}>{previewDoc?.size}</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={styles.documentPreviewCanvas}>
                {previewDoc?.uri &&
                !String(previewDoc?.name || (previewDoc as any)?.file_name || '').toLowerCase().endsWith('.pdf') &&
                !String(previewDoc?.type || '').includes('pdf') ? (
                  <View style={styles.previewImageWrapper}>
                    <Image
                      source={{ uri: previewDoc.file_url || previewDoc.uri }}
                      style={styles.previewImageThumb}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.pdfBadgePreviewBox}>
                    <Ionicons name="document-text" size={48} color="#DC2626" />
                    <Text style={styles.pdfBadgeName}>{previewDoc?.name || 'Document'}</Text>
                    <Text style={styles.pdfBadgeSub}>PDF Attachment Document</Text>
                  </View>
                )}

                {/* S3 Live URL Box */}
                {(previewDoc?.file_url || previewDoc?.uri) ? (
                  <View style={styles.previewS3Box}>
                    <View style={styles.previewS3Header}>
                      <Ionicons name="cloud-done" size={15} color="#059669" />
                      <Text style={styles.previewS3Title}>Document Live S3 URL</Text>
                    </View>
                    <Text style={styles.previewS3Url} selectable numberOfLines={3}>
                      {previewDoc.file_url || previewDoc.uri}
                    </Text>
                    <TouchableOpacity
                      style={styles.previewS3OpenBtn}
                      activeOpacity={0.8}
                      onPress={() => Linking.openURL(previewDoc.file_url || previewDoc.uri || '')}
                    >
                      <Ionicons name="open-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.previewS3OpenBtnText}>Open Document Link in Browser</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closePreviewBtn}
              activeOpacity={0.88}
              onPress={() => setPreviewDoc(null)}
            >
              <Text style={styles.closePreviewBtnText}>{t('closePreview') || 'बंद करा'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Selection Modal */}
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerCaseId: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginRight: 6,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
  },
  schemeTag: {
    backgroundColor: '#E8F4F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B0DDD6',
  },
  schemeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A5C53',
  },
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  statusCardAlert: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusCardSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusCardInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusCardDanger: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  statusCardMuted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  statusSub: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  stepNode: {
    alignItems: 'center',
    width: 62,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 13,
  },
  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 13,
    marginHorizontal: -4,
  },
  stepConnectorPassed: {
    backgroundColor: '#10B981',
  },
  revertBox: {
    backgroundColor: '#FFF7F7',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  revertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  revertHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  revertReasonText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  requestedDocPill: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  requestedDocLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  requestedDocValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7F1D1D',
  },
  attachedDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 10,
  },
  attachedDocName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachedDocMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  removeDocBtn: {
    padding: 6,
  },
  uploadButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  uploadBtnHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4F2',
    borderWidth: 1.5,
    borderColor: '#B0DDD6',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  uploadBtnHalfText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A5C53',
  },
  remarkInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 12,
    minHeight: 40,
  },
  submitBtn: {
    backgroundColor: '#0A5C53',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#95B7B0',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    flexWrap: 'wrap',
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
    minWidth: '35%',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1.2,
    textAlign: 'right',
  },
  hospitalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#B0DDD6',
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  hospitalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  hospitalTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  hospitalTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  hospitalLocation: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginTop: 3,
  },
  hospitalAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 6,
  },
  hospitalAddressText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    flex: 1,
  },
  visitDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  visitDateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  visitDateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#047857',
    marginTop: 2,
  },
  hospitalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hospitalCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 10,
    borderRadius: 10,
  },
  hospitalCallBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A5C53',
  },
  sevakCard: {
    backgroundColor: '#E8F4F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#B0DDD6',
  },
  sevakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sevakIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sevakName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A5C53',
  },
  sevakRole: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
  },
  sevakActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sevakCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A5C53',
    paddingVertical: 10,
    borderRadius: 10,
  },
  sevakCallBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sevakWhatsAppBtn: {
    width: 44,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 10,
  },
  docItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  docItemSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  docCloudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  docCloudUrl: {
    fontSize: 11,
    color: '#15803D',
    flex: 1,
    marginHorizontal: 6,
    textDecorationLine: 'underline',
  },
  docOpenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docOpenTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    marginRight: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  previewModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewDocNameSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  documentPreviewCanvas: {
    backgroundColor: '#FAFBFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E9E5',
    padding: 14,
    marginVertical: 10,
    alignItems: 'center',
  },
  previewImageWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  previewImageThumb: {
    width: '100%',
    height: '100%',
  },
  pdfBadgePreviewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  pdfBadgeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 10,
    textAlign: 'center',
  },
  pdfBadgeSub: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  previewS3Box: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  previewS3Url: {
    fontSize: 11,
    color: '#166534',
    marginBottom: 8,
  },
  previewS3OpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A5C53',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  previewS3OpenBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closePreviewBtn: {
    backgroundColor: '#0A5C53',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  closePreviewBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  // SLA Escalation & Priority Styles
  slaContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  slaContainerNormal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  slaContainerBreached: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  slaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slaPriorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  slaPillCritical: {
    backgroundColor: '#DC2626',
  },
  slaPillHigh: {
    backgroundColor: '#EA580C',
  },
  slaPillMedium: {
    backgroundColor: '#2563EB',
  },
  slaPriorityPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  slaLimitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  slaBreachedContent: {
    marginTop: 4,
  },
  slaBreachedNotice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 18,
    marginBottom: 10,
  },
  notifyAdminBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  notifyAdminBtnDisabled: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    borderWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  notifyAdminBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  notifyAdminBtnTextDisabled: {
    color: '#065F46',
    fontWeight: '700',
  },
  cooldownBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  lastReminderSentText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },
  slaNormalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  slaNormalText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  slaSingleLineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  slaSingleLineText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 18,
  },
  slaCountdownHighlight: {
    color: '#0A5C53',
    fontWeight: '800',
  },
});
