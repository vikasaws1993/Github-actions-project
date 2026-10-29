import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Modal,
  Image,
  PermissionsAndroid,
  ActivityIndicator,
  RefreshControl,
  Linking,
  BackHandler,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera } from 'react-native-image-picker';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { colors } from '../../../shared/theme/colors';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { useAuth } from '../../../shared/hooks/useAuth';
import { APP_CONFIG } from '../../../shared/constants/config';
import { formatCompressedFileSize, optimizeDocumentMetadata } from '../../../shared/utils/documentCompressor';
import { schemeApi } from '../../../api/schemeApi';
import { applicationApi, ApplicationSubmitPayload } from '../../../api/applicationApi';
import { uploadDocumentToS3 } from '../../../api/s3Api';
import { applicationStore } from '../../services/applicationStore';
import { ApplicationPriority } from '../../types/application.types';
import { storage } from '../../../shared/services/storage/storage';
import { useSchemes } from '../../../shared/context/SchemeContext';
import { SearchableSelectModal } from '../../../shared/components/SearchableSelectModal';
import { LanguageConfirmationModal } from '../../../shared/components/LanguageConfirmationModal';
import { useLanguageConfirmation } from '../../../shared/hooks/useLanguageConfirmation';
import { locationDirectoryService } from '../../../shared/services/locationDirectoryService';
import { DatePickerModal } from '../../../shared/components/DatePickerModal';

type StepNumber = 1 | 2 | 3 | 4;
type DocCategory = 'aadhaar' | 'income' | 'medical' | 'ration' | 'referral' | 'abha' | 'pmjay' | 'other';

export interface UploadedDoc {
  id: string;
  name: string;
  size: string;
  source: 'camera' | 'device';
  timestamp: string;
  category: DocCategory;
  uri?: string;
  file_url?: string;
  type?: string;
  uploading?: boolean;
}

interface DynamicSchemeItem {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  isDashed?: boolean;
}

const DEFAULT_SCHEME_OPTIONS: DynamicSchemeItem[] = [
  {
    id: 'pmjay',
    name: 'PMJAY (Ayushman Bharat)',
    subtitle: 'Free treatment up to ₹5 Lakh',
    icon: 'shield-checkmark',
  },
  {
    id: 'mjpjay',
    name: 'Mahatma Jyotiba Phule Jan Arogya Yojana',
    subtitle: 'Free treatment up to ₹1.5 Lakh',
    icon: 'medkit',
  },
  {
    id: 'cm_relief_fund',
    name: 'CM Relief Fund (Chief Minister Medical Aid)',
    subtitle: 'Govt financial grant for critical care & surgeries',
    icon: 'heart-circle',
  },
  {
    id: 'other',
    name: 'Other Government Schemes',
    subtitle: 'Other available govt schemes',
    icon: 'business',
  },
  {
    id: 'dont_know_schemes',
    name: 'Not sure which scheme to choose',
    subtitle: 'Our Arogya Sevak will help you choose the right scheme',
    icon: 'help-circle',
    isDashed: true,
  },
];

interface RelationOptionItem {
  key: string;
  labelKey: any;
}

const RELATION_OPTIONS: RelationOptionItem[] = [
  { key: 'husband', labelKey: 'relHusband' },
  { key: 'wife', labelKey: 'relWife' },
  { key: 'father', labelKey: 'relFather' },
  { key: 'mother', labelKey: 'relMother' },
  { key: 'son', labelKey: 'relSon' },
  { key: 'daughter', labelKey: 'relDaughter' },
  { key: 'brother', labelKey: 'relBrother' },
  { key: 'sister', labelKey: 'relSister' },
  { key: 'friend', labelKey: 'relFriend' },
  { key: 'guardian', labelKey: 'relGuardian' },
  { key: 'other', labelKey: 'relOther' },
];

interface RecommenderTypeOption {
  key: string;
  labelKey: any;
  icon: any;
}

const RECOMMENDER_TYPE_OPTIONS: RecommenderTypeOption[] = [
  { key: 'corporator', labelKey: 'recommenderTypeCorporator', icon: 'business-outline' },
  { key: 'mla', labelKey: 'recommenderTypeMla', icon: 'ribbon-outline' },
  { key: 'mp', labelKey: 'recommenderTypeMp', icon: 'flag-outline' },
  { key: 'minister', labelKey: 'recommenderTypeMinister', icon: 'shield-checkmark-outline' },
  { key: 'public_trust', labelKey: 'recommenderTypePublicTrust', icon: 'heart-outline' },
  { key: 'private_trust', labelKey: 'recommenderTypePrivateTrust', icon: 'briefcase-outline' },
  { key: 'doctor_hospital', labelKey: 'recommenderTypeDoctorHospital', icon: 'medkit-outline' },
  { key: 'social_worker', labelKey: 'recommenderTypeSocialWorker', icon: 'people-outline' },
  { key: 'other', labelKey: 'recommenderTypeOther', icon: 'create-outline' },
];

const calculateAgeFromDob = (dobStr?: string): string => {
  if (!dobStr) return '';
  const cleaned = dobStr.trim();
  let day = 0, month = 0, year = 0;
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  } else if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
    }
  }

  if (!day || isNaN(day) || isNaN(month) || isNaN(year) || year < 1900) return '';

  const birthDate = new Date(year, month, day);
  const today = new Date();
  let calculatedAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    calculatedAge--;
  }
  return calculatedAge >= 0 ? calculatedAge.toString() : '';
};

const formatToDdMmYyyy = (val?: string): string => {
  if (!val) return '';
  const clean = val.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(clean)) {
    const parts = clean.split(/[\/\-T ]/);
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(clean)) {
    const parts = clean.split('-');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  return clean;
};

export const NewApplicationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const {
    languageConfirmationState,
    checkAndConfirmLanguage,
    handleModalContinue,
    handleModalSwitchLanguage,
    handleModalClose,
  } = useLanguageConfirmation();

  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const scrollViewRef = useRef<any>(null);

  // Auto-scroll to top whenever step changes (going Next or Back)
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  // Step 1 State: Selected Scheme & ABHA Card (Loaded instantly from SchemeContext cache)
  const {
    schemes: dynamicSchemes,
    isLoading: isLoadingSchemes,
    isRefreshing: isRefreshingSchemes,
    refreshSchemes,
  } = useSchemes();

  const [selectedScheme, setSelectedScheme] = useState<string>('');
  const [abhaNumber, setAbhaNumber] = useState('');
  const [pmjayCardNumber, setPmjayCardNumber] = useState('');

  // Keep selectedScheme synced if dynamicSchemes updates and current selected option is invalid
  useEffect(() => {
    if (selectedScheme && dynamicSchemes.length > 0 && !dynamicSchemes.some((s) => s.id === selectedScheme)) {
      setSelectedScheme('');
    }
  }, [dynamicSchemes, selectedScheme]);

  // Step 2 State: Applying For & Priority
  const [applyingFor, setApplyingFor] = useState<'self' | 'relative'>('self');
  const [priority, setPriority] = useState<ApplicationPriority>('regular');

  // Relation Dropdown State
  const [selectedRelationKey, setSelectedRelationKey] = useState<string>('');
  const [customRelationText, setCustomRelationText] = useState<string>('');
  const [relationModalVisible, setRelationModalVisible] = useState<boolean>(false);

  // Patient Info
  const initialDob = formatToDdMmYyyy(user?.dob);
  const initialAge = calculateAgeFromDob(initialDob);
  const [patientName, setPatientName] = useState(user?.name || '');
  const [patientPhone, setPatientPhone] = useState(user?.phoneNumber?.replace('+91', '').trim() || '');
  const [patientDob, setPatientDob] = useState(initialDob || '');
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [age, setAge] = useState(initialAge || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(() => {
    if (user?.gender) {
      const gLower = user.gender.toLowerCase();
      if (gLower.includes('female')) return 'female';
      if (gLower.includes('other')) return 'other';
    }
    return 'male';
  });

  // Patient Address (Detailed Breakdown)
  const [villageCity, setVillageCity] = useState('');
  const [taluka, setTaluka] = useState(user?.taluka || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [address, setAddress] = useState(user?.address || '');

  // Location Autocomplete Modals
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [talukaModalVisible, setTalukaModalVisible] = useState(false);

  const handleSelectDistrict = (selectedDistrict: string) => {
    setDistrict(selectedDistrict);
    setTaluka('');
    setPincode('');
  };

  const handleSelectTaluka = (selectedTaluka: string) => {
    setTaluka(selectedTaluka);
    setPincode('');
  };

  const handlePincodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setPincode(cleaned);
  };

  // Relative / Emergency Contact Info
  const [relativeName, setRelativeName] = useState('');
  const [relativePhone, setRelativePhone] = useState('');
  const [relativeRelation, setRelativeRelation] = useState('');

  // Treatment Type (OPD first, IPD second) & Hospital Name
  const [treatmentType, setTreatmentType] = useState<'opd' | 'ipd'>('opd');
  const [hospitalName, setHospitalName] = useState('');

  // Cause of Medical Issue Note
  const [medicalCauseNote, setMedicalCauseNote] = useState('');

  // Recommender / Referral Details (Type dropdown + Single Full Name)
  const [selectedRecommenderType, setSelectedRecommenderType] = useState<string>('');
  const [customRecommenderType, setCustomRecommenderType] = useState<string>('');
  const [recommenderTypeModalVisible, setRecommenderTypeModalVisible] = useState<boolean>(false);
  const [referralFullName, setReferralFullName] = useState<string>('');
  const [referralFirstName, setReferralFirstName] = useState('');
  const [referralLastName, setReferralLastName] = useState('');

  // Step 3 State: Documents
  const [aadhaarDoc, setAadhaarDoc] = useState<UploadedDoc | null>(null);
  const [incomeDoc, setIncomeDoc] = useState<UploadedDoc | null>(null);
  const [medicalDocs, setMedicalDocs] = useState<UploadedDoc[]>([]);
  const [rationCardDoc, setRationCardDoc] = useState<UploadedDoc | null>(null);
  const [referralDoc, setReferralDoc] = useState<UploadedDoc | null>(null);
  const [abhaDoc, setAbhaDoc] = useState<UploadedDoc | null>(null);
  const [pmjayDoc, setPmjayDoc] = useState<UploadedDoc | null>(null);
  const [otherDoc, setOtherDoc] = useState<UploadedDoc | null>(null);
  const [remarks, setRemarks] = useState('');

  // Modals
  const [uploadPickerVisible, setUploadPickerVisible] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{
    category: DocCategory;
    replaceId?: string;
  } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<UploadedDoc | null>(null);

  // Step 4 State: Submitted
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState('');

  // Draft State & Auto-Save
  const [draftPromptVisible, setDraftPromptVisible] = useState(false);
  const [savedDraftData, setSavedDraftData] = useState<any>(null);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for saved draft on component mount
  useEffect(() => {
    const checkSavedDraft = async () => {
      try {
        const draftJson = await storage.getItem<any>(APP_CONFIG.STORAGE_KEYS.APPLICATION_DRAFT);
        if (draftJson && typeof draftJson === 'object') {
          setSavedDraftData(draftJson);
          setDraftPromptVisible(true);
        }
      } catch (err) {
        console.warn('[NewApplicationScreen] Failed to load application draft:', err);
      }
    };
    checkSavedDraft();
  }, []);

  const handleRestoreDraft = () => {
    if (!savedDraftData) return;
    setIsRestoringDraft(true);
    try {
      if (savedDraftData.currentStep) setCurrentStep(savedDraftData.currentStep);
      if (savedDraftData.selectedScheme) setSelectedScheme(savedDraftData.selectedScheme);
      if (savedDraftData.abhaNumber !== undefined) setAbhaNumber(savedDraftData.abhaNumber);
      if (savedDraftData.pmjayCardNumber !== undefined) setPmjayCardNumber(savedDraftData.pmjayCardNumber);
      if (savedDraftData.applyingFor) setApplyingFor(savedDraftData.applyingFor);
      if (savedDraftData.priority) setPriority(savedDraftData.priority);
      if (savedDraftData.selectedRelationKey !== undefined) setSelectedRelationKey(savedDraftData.selectedRelationKey);
      if (savedDraftData.customRelationText !== undefined) setCustomRelationText(savedDraftData.customRelationText);
      if (savedDraftData.patientName !== undefined) setPatientName(savedDraftData.patientName);
      if (savedDraftData.patientPhone !== undefined) setPatientPhone(savedDraftData.patientPhone);
      if (savedDraftData.patientDob !== undefined) setPatientDob(savedDraftData.patientDob);
      if (savedDraftData.age !== undefined) setAge(savedDraftData.age);
      if (savedDraftData.gender) setGender(savedDraftData.gender);
      if (savedDraftData.villageCity !== undefined) setVillageCity(savedDraftData.villageCity);
      if (savedDraftData.taluka !== undefined) setTaluka(savedDraftData.taluka);
      if (savedDraftData.district !== undefined) setDistrict(savedDraftData.district);
      if (savedDraftData.pincode !== undefined) setPincode(savedDraftData.pincode);
      if (savedDraftData.address !== undefined) setAddress(savedDraftData.address);
      if (savedDraftData.relativeName !== undefined) setRelativeName(savedDraftData.relativeName);
      if (savedDraftData.relativePhone !== undefined) setRelativePhone(savedDraftData.relativePhone);
      if (savedDraftData.relativeRelation !== undefined) setRelativeRelation(savedDraftData.relativeRelation);
      if (savedDraftData.treatmentType) setTreatmentType(savedDraftData.treatmentType);
      if (savedDraftData.hospitalName !== undefined) setHospitalName(savedDraftData.hospitalName);
      if (savedDraftData.medicalCauseNote !== undefined) setMedicalCauseNote(savedDraftData.medicalCauseNote);
      if (savedDraftData.selectedRecommenderType !== undefined) setSelectedRecommenderType(savedDraftData.selectedRecommenderType);
      if (savedDraftData.customRecommenderType !== undefined) setCustomRecommenderType(savedDraftData.customRecommenderType);
      if (savedDraftData.referralFullName !== undefined) setReferralFullName(savedDraftData.referralFullName);
      if (savedDraftData.referralFirstName !== undefined) setReferralFirstName(savedDraftData.referralFirstName);
      if (savedDraftData.referralLastName !== undefined) setReferralLastName(savedDraftData.referralLastName);
      if (savedDraftData.aadhaarDoc !== undefined) setAadhaarDoc(savedDraftData.aadhaarDoc);
      if (savedDraftData.incomeDoc !== undefined) setIncomeDoc(savedDraftData.incomeDoc);
      if (savedDraftData.medicalDocs !== undefined) setMedicalDocs(savedDraftData.medicalDocs || []);
      if (savedDraftData.rationCardDoc !== undefined) setRationCardDoc(savedDraftData.rationCardDoc);
      if (savedDraftData.referralDoc !== undefined) setReferralDoc(savedDraftData.referralDoc);
      if (savedDraftData.abhaDoc !== undefined) setAbhaDoc(savedDraftData.abhaDoc);
      if (savedDraftData.pmjayDoc !== undefined) setPmjayDoc(savedDraftData.pmjayDoc);
      if (savedDraftData.otherDoc !== undefined) setOtherDoc(savedDraftData.otherDoc);
      if (savedDraftData.remarks !== undefined) setRemarks(savedDraftData.remarks);
    } catch (err) {
      console.error('Error restoring draft:', err);
    } finally {
      setIsRestoringDraft(false);
      setDraftPromptVisible(false);
    }
  };

  const handleDiscardDraft = async () => {
    setDraftPromptVisible(false);
    setSavedDraftData(null);
    try {
      await storage.removeItem(APP_CONFIG.STORAGE_KEYS.APPLICATION_DRAFT);
    } catch (err) {
      console.warn('Failed to clear application draft:', err);
    }
  };

  // Debounced Auto-Save Form Data to Local Storage
  useEffect(() => {
    if (draftPromptVisible || isSubmitted || isRestoringDraft) return;

    const timer = setTimeout(async () => {
      const draftPayload = {
        currentStep,
        selectedScheme,
        abhaNumber,
        pmjayCardNumber,
        applyingFor,
        priority,
        selectedRelationKey,
        customRelationText,
        patientName,
        patientPhone,
        patientDob,
        age,
        gender,
        villageCity,
        taluka,
        district,
        pincode,
        address,
        relativeName,
        relativePhone,
        relativeRelation,
        treatmentType,
        hospitalName,
        medicalCauseNote,
        selectedRecommenderType,
        customRecommenderType,
        referralFullName,
        referralFirstName,
        referralLastName,
        aadhaarDoc,
        incomeDoc,
        medicalDocs,
        rationCardDoc,
        referralDoc,
        abhaDoc,
        pmjayDoc,
        otherDoc,
        remarks,
        savedAt: new Date().toISOString(),
      };

      try {
        await storage.setItem(APP_CONFIG.STORAGE_KEYS.APPLICATION_DRAFT, draftPayload);
      } catch (err) {
        console.warn('Auto-save draft error:', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    currentStep,
    selectedScheme,
    abhaNumber,
    applyingFor,
    priority,
    selectedRelationKey,
    customRelationText,
    patientName,
    patientPhone,
    age,
    gender,
    villageCity,
    taluka,
    district,
    pincode,
    address,
    relativeName,
    relativePhone,
    relativeRelation,
    treatmentType,
    hospitalName,
    medicalCauseNote,
    selectedRecommenderType,
    customRecommenderType,
    referralFullName,
    referralFirstName,
    referralLastName,
    aadhaarDoc,
    incomeDoc,
    medicalDocs,
    rationCardDoc,
    referralDoc,
    abhaDoc,
    pmjayDoc,
    otherDoc,
    remarks,
    draftPromptVisible,
    isSubmitted,
    isRestoringDraft,
  ]);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );
  const bottomInset = Math.max(insets.bottom, 20);

  // Auto pre-fill user profile details safely without wiping user-entered fields
  React.useEffect(() => {
    if (user) {
      if (applyingFor === 'self') {
        if (!patientName && user.name) setPatientName(user.name);
        if (!patientPhone && user.phoneNumber) setPatientPhone(user.phoneNumber.replace('+91', '').trim());

        if (user.dob && !patientDob) {
          const formattedDob = formatToDdMmYyyy(user.dob);
          setPatientDob(formattedDob);
          const calculatedAge = calculateAgeFromDob(formattedDob);
          if (calculatedAge && !age) setAge(calculatedAge);
        }

        if (user.gender) {
          const gLower = user.gender.toLowerCase();
          if (gLower.includes('female')) setGender('female');
          else if (gLower.includes('other')) setGender('other');
          else setGender('male');
        }

        if (!district && user.district) setDistrict(user.district);
        if (!taluka && user.taluka) setTaluka(user.taluka);
        if (!pincode && user.pincode) setPincode(user.pincode);
        if (!address && user.address) setAddress(user.address);
      } else if (applyingFor === 'relative') {
        if (user.name && !relativeName) setRelativeName(user.name);
        if (user.phoneNumber && !relativePhone) setRelativePhone(user.phoneNumber.replace('+91', '').trim());
      }
    }
  }, [user, applyingFor]);

  const handleSelectApplyingFor = (type: 'self' | 'relative') => {
    setApplyingFor(type);
    if (type === 'self') {
      if (user?.name) setPatientName(user.name);
      if (user?.phoneNumber) setPatientPhone(user.phoneNumber.replace('+91', '').trim());
      if (user?.dob) {
        const formattedDob = formatToDdMmYyyy(user.dob);
        setPatientDob(formattedDob);
        const calculatedAge = calculateAgeFromDob(formattedDob);
        if (calculatedAge) setAge(calculatedAge);
      }
      if (user?.gender) {
        const gLower = user.gender.toLowerCase();
        if (gLower.includes('female')) setGender('female');
        else if (gLower.includes('other')) setGender('other');
        else setGender('male');
      }
      if (user?.district) setDistrict(user.district);
      if (user?.taluka) setTaluka(user.taluka);
      if (user?.pincode) setPincode(user.pincode);
      if (user?.address) setAddress(user.address);
    } else if (type === 'relative') {
      // Clear patient details so relative's patient info can be entered
      setPatientName('');
      setPatientPhone('');
      setPatientDob('');
      setAge('');

      // Pre-fill relative contact info with citizen info
      if (user?.name) setRelativeName(user.name);
      if (user?.phoneNumber) setRelativePhone(user.phoneNumber.replace('+91', '').trim());
    }
  };

  const handlePatientDobChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setPatientDob(formatted);
    const calculatedAge = calculateAgeFromDob(formatted);
    if (calculatedAge) {
      setAge(calculatedAge);
    }
  };

  const handleConfirmDob = (formattedDate: string) => {
    setPatientDob(formattedDate);
    const calculatedAge = calculateAgeFromDob(formattedDate);
    if (calculatedAge) {
      setAge(calculatedAge);
    }
    setDobPickerVisible(false);
  };

  const handleSelectRelationOption = (item: RelationOptionItem) => {
    setSelectedRelationKey(item.key);
    setRelationModalVisible(false);
    if (item.key === 'other') {
      setRelativeRelation(customRelationText);
    } else {
      setRelativeRelation(t(item.labelKey));
    }
  };

  const handleCustomRelationChange = (text: string) => {
    setCustomRelationText(text);
    setRelativeRelation(text);
  };

  // ABHA and PMJAY Card input handlers & validation
  const handleAbhaChange = (text: string) => {
    const raw = text.replace(/[^0-9]/g, '').slice(0, 14);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = raw.slice(0, 2) + '-' + raw.slice(2);
    }
    if (raw.length > 6) {
      formatted = formatted.slice(0, 7) + '-' + raw.slice(6);
    }
    if (raw.length > 10) {
      formatted = formatted.slice(0, 12) + '-' + raw.slice(10);
    }
    setAbhaNumber(formatted);
  };

  const handlePmjayChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
    setPmjayCardNumber(cleaned);
  };

  const rawAbhaDigits = abhaNumber.replace(/[^0-9]/g, '');
  const isAbhaValid = rawAbhaDigits.length === 0 || rawAbhaDigits.length === 14;
  const abhaError = (!isAbhaValid && rawAbhaDigits.length > 0) ? t('validationAbhaCard') : '';

  const cleanPmjayChars = pmjayCardNumber.trim().replace(/[^A-Z0-9-]/g, '');
  const isPmjayValid = cleanPmjayChars.length === 0 || (cleanPmjayChars.length >= 9 && cleanPmjayChars.length <= 18);
  const pmjayError = (!isPmjayValid && cleanPmjayChars.length > 0) ? t('validationPmjayCard') : '';

  // Step Validations
  const isStep1Valid = Boolean(selectedScheme);

  const isStep2Valid = (() => {
    // 1. Age is mandatory for all applications
    if (!age.trim()) return false;

    // 2. Relation with patient is mandatory
    const finalRelation = selectedRelationKey === 'other' ? customRelationText.trim() : relativeRelation.trim();
    if (!finalRelation) return false;

    // 3. Relative full name & 10-digit mobile are mandatory
    if (!relativeName.trim() || relativePhone.trim().length < 10) return false;

    // 4. Medical cause / health issue description note is mandatory
    if (!medicalCauseNote.trim()) return false;

    // 5. Health Card validation (if provided)
    if (!isAbhaValid || !isPmjayValid) return false;

    // 6. For relative mode: patient name, 10-digit patient phone, and address (village & taluka) are mandatory
    if (applyingFor === 'relative') {
      const hasPatientDetails = patientName.trim().length > 0 && patientPhone.trim().length >= 10;
      const hasAddressBreakdown = villageCity.trim().length > 0 && taluka.trim().length > 0;
      if (!hasPatientDetails || !hasAddressBreakdown) return false;
    }

    return true;
  })();

  // Check if any document is currently uploading to S3
  const isAnyDocUploading = Boolean(
    aadhaarDoc?.uploading ||
    incomeDoc?.uploading ||
    rationCardDoc?.uploading ||
    referralDoc?.uploading ||
    abhaDoc?.uploading ||
    pmjayDoc?.uploading ||
    otherDoc?.uploading ||
    medicalDocs.some((d) => d.uploading)
  );

  // Mandatory docs: Aadhaar, Income Certificate, at least 1 Medical report, and none uploading
  const isStep3Valid = Boolean(
    aadhaarDoc &&
    !aadhaarDoc.uploading &&
    incomeDoc &&
    !incomeDoc.uploading &&
    medicalDocs.length > 0 &&
    !medicalDocs.some((d) => d.uploading) &&
    !isAnyDocUploading
  );

  const uploadedDocsCount =
    (aadhaarDoc ? 1 : 0) +
    (incomeDoc ? 1 : 0) +
    medicalDocs.length +
    (rationCardDoc ? 1 : 0) +
    (referralDoc ? 1 : 0) +
    (abhaDoc ? 1 : 0) +
    (pmjayDoc ? 1 : 0) +
    (otherDoc ? 1 : 0);

  const openUploadPicker = (category: DocCategory, replaceId?: string) => {
    setUploadTarget({ category, replaceId });
    setUploadPickerVisible(true);
  };

  const formatFileSize = (bytes?: number | null): string => {
    return formatCompressedFileSize(bytes);
  };

  const applyUploadedDoc = (
    category: DocCategory,
    doc: UploadedDoc,
    replaceId?: string
  ) => {
    if (category === 'aadhaar') {
      setAadhaarDoc(doc);
    } else if (category === 'income') {
      setIncomeDoc(doc);
    } else if (category === 'ration') {
      setRationCardDoc(doc);
    } else if (category === 'referral') {
      setReferralDoc(doc);
    } else if (category === 'abha') {
      setAbhaDoc(doc);
    } else if (category === 'pmjay') {
      setPmjayDoc(doc);
    } else if (category === 'other') {
      setOtherDoc(doc);
    } else if (category === 'medical') {
      const targetId = replaceId || doc.id;
      setMedicalDocs((prev) => {
        const index = prev.findIndex((d) => d.id === targetId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = doc;
          return updated;
        }
        return [...prev, doc];
      });
    }
  };

  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i;
    const l = bytes.length;
    for (i = 2; i < l; i += 3) {
      result += chars[bytes[i - 2] >> 2];
      result += chars[((bytes[i - 2] & 3) << 4) | (bytes[i - 1] >> 4)];
      result += chars[((bytes[i - 1] & 15) << 2) | (bytes[i] >> 6)];
      result += chars[bytes[i] & 63];
    }
    if (i === l + 1) {
      result += chars[bytes[i - 2] >> 2];
      result += chars[(bytes[i - 2] & 3) << 4];
      result += '==';
    }
    if (i === l) {
      result += chars[bytes[i - 2] >> 2];
      result += chars[((bytes[i - 2] & 3) << 4) | (bytes[i - 1] >> 4)];
      result += chars[(bytes[i - 1] & 15) << 2];
      result += '=';
    }
    return result;
  };

  const convertUriToBase64 = (uri: string, mimeType?: string): Promise<string> => {
    if (!uri) return Promise.resolve('');
    if (uri.startsWith('data:')) return Promise.resolve(uri);

    return new Promise((resolve) => {
      // First attempt: fetch -> blob -> FileReader (best for React Native Android file:// & content:// URIs)
      fetch(uri)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const resStr = reader.result as string;
            if (resStr && resStr.startsWith('data:')) {
              if (mimeType && resStr.startsWith('data:application/octet-stream;')) {
                resolve(resStr.replace('data:application/octet-stream;', `data:${mimeType};`));
              } else {
                resolve(resStr);
              }
            } else {
              tryXhr();
            }
          };
          reader.onerror = () => tryXhr();
          reader.readAsDataURL(blob);
        })
        .catch(() => tryXhr());

      function tryXhr() {
        try {
          const xhr = new XMLHttpRequest();
          xhr.onload = function () {
            try {
              const buffer = xhr.response;
              if (buffer) {
                const bytes = new Uint8Array(buffer);
                const b64 = uint8ArrayToBase64(bytes);
                const finalMime = mimeType || 'application/octet-stream';
                resolve(`data:${finalMime};base64,${b64}`);
              } else {
                resolve(uri);
              }
            } catch (bufErr) {
              console.warn('[NewApplicationScreen] ArrayBuffer conversion error:', bufErr);
              resolve(uri);
            }
          };
          xhr.onerror = function () {
            console.warn('[NewApplicationScreen] XHR error loading URI:', uri);
            resolve(uri);
          };
          xhr.open('GET', uri);
          xhr.responseType = 'arraybuffer';
          xhr.send();
        } catch (err) {
          console.warn('[NewApplicationScreen] convertUriToBase64 exception:', err);
          resolve(uri);
        }
      }
    });
  };

  const handleSelectSource = async (source: 'camera' | 'device') => {
    if (!uploadTarget) return;
    const { category, replaceId } = uploadTarget;
    setUploadPickerVisible(false);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      if (source === 'camera') {
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
                  'कागदपत्रांचा फोटो काढून थेट अपलोड करण्यासाठी कृपया कॅमेरा परवानगी द्या.\nPlease allow camera access to capture and upload scheme documents.',
                buttonNeutral: 'नंतर विचारा / Later',
                buttonNegative: 'नाकारा / Cancel',
                buttonPositive: 'परवानगी द्या / Allow',
              }
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert(
                'कॅमेरा परवानगी आवश्यक / Permission Required',
                'कागदपत्राचा फोटो काढण्यासाठी कॅमेरा परवानगी आवश्यक आहे. कृपया सेटिंग्जमध्ये जाऊन परवानगी द्या.\nCamera permission is required to take photos of documents. Please enable it in App Settings.',
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
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.7,
          saveToPhotos: false,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) {
          return;
        }

        const asset = result.assets[0];
        let defaultName = 'Document_Photo.jpg';
        if (category === 'aadhaar') defaultName = 'Aadhaar_Card_Photo.jpg';
        else if (category === 'income') defaultName = 'Income_Certificate_Photo.jpg';
        else if (category === 'ration') defaultName = 'Ration_Card_Photo.jpg';
        else if (category === 'referral') defaultName = 'Referral_Letter_Photo.jpg';
        else if (category === 'abha') defaultName = 'ABHA_Card_Photo.jpg';
        else if (category === 'pmjay') defaultName = 'PMJAY_Card_Photo.jpg';
        else if (category === 'other') defaultName = 'Other_Document_Photo.jpg';
        else {
          const idx = replaceId
            ? medicalDocs.findIndex((d) => d.id === replaceId) + 1
            : medicalDocs.length + 1;
          defaultName = `Medical_Report_${idx}.jpg`;
        }

        const optMeta = optimizeDocumentMetadata(asset.fileSize, defaultName);
        const docId = replaceId || `${category}_${Date.now()}`;
        const fileName = asset.fileName || defaultName;
        const mimeType = asset.type || 'image/jpeg';
        const localUri = asset.uri || '';

        // 1. Instantly set document with uploading state
        const tempDoc: UploadedDoc = {
          id: docId,
          name: fileName,
          size: optMeta.formattedSize,
          source: 'camera',
          timestamp: timeStr,
          category,
          uri: localUri,
          file_url: '',
          type: mimeType,
          uploading: true,
        };
        applyUploadedDoc(category, tempDoc, replaceId);

        // 2. Direct upload to S3 via presigned streaming
        try {
          const remoteUrl = await uploadDocumentToS3(
            localUri,
            fileName,
            mimeType,
            category
          );
          console.log(`[NewApplicationScreen] Successfully uploaded ${category} photo to S3:`, remoteUrl);
          applyUploadedDoc(
            category,
            {
              ...tempDoc,
              uri: remoteUrl,
              file_url: remoteUrl,
              uploading: false,
            },
            replaceId || docId
          );
        } catch (uploadErr: any) {
          console.warn('[NewApplicationScreen] Camera photo upload warning:', uploadErr);
          applyUploadedDoc(
            category,
            {
              ...tempDoc,
              uploading: false,
            },
            replaceId || docId
          );
        }
      } else {
        try {
          const res = await pick({
            type: [types.pdf, types.images, '*/*'],
            allowMultiSelection: false,
            copyTo: 'cachesDirectory',
          });

          if (!res || res.length === 0) return;
          const picked = res[0];

          let defaultName = 'Document_File.pdf';
          if (category === 'aadhaar') defaultName = 'Aadhaar_Card_Doc.pdf';
          else if (category === 'income') defaultName = 'Income_Certificate_Doc.pdf';
          else if (category === 'ration') defaultName = 'Ration_Card_Doc.pdf';
          else if (category === 'referral') defaultName = 'Referral_Letter_Doc.pdf';
          else if (category === 'abha') defaultName = 'ABHA_Card_Doc.pdf';
          else if (category === 'pmjay') defaultName = 'PMJAY_Card_Doc.pdf';
          else if (category === 'other') defaultName = 'Other_Document_Doc.pdf';
          else {
            const idx = replaceId
              ? medicalDocs.findIndex((d) => d.id === replaceId) + 1
              : medicalDocs.length + 1;
            defaultName = `Medical_Report_${idx}.pdf`;
          }

          const targetUri = (picked as any).fileCopyUri || picked.uri;
          const fileName = picked.name || defaultName;
          const mimeType = picked.type || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          const docId = replaceId || `${category}_${Date.now()}`;

          // 1. Instantly set document with uploading state
          const tempDoc: UploadedDoc = {
            id: docId,
            name: fileName,
            size: formatFileSize(picked.size),
            source: 'device',
            timestamp: timeStr,
            category,
            uri: targetUri,
            file_url: '',
            type: mimeType,
            uploading: true,
          };
          applyUploadedDoc(category, tempDoc, replaceId);

          // 2. Direct upload to S3 via presigned streaming
          try {
            const remoteUrl = await uploadDocumentToS3(
              targetUri,
              fileName,
              mimeType,
              category
            );
            console.log(`[NewApplicationScreen] Successfully uploaded ${category} file to S3:`, remoteUrl);
            applyUploadedDoc(
              category,
              {
                ...tempDoc,
                uri: remoteUrl,
                file_url: remoteUrl,
                uploading: false,
              },
              replaceId || docId
            );
          } catch (uploadErr: any) {
            console.warn('[NewApplicationScreen] Document pick upload warning:', uploadErr);
            applyUploadedDoc(
              category,
              {
                ...tempDoc,
                uploading: false,
              },
              replaceId || docId
            );
          }
        } catch (pickErr: any) {
          if (isErrorWithCode(pickErr) && pickErr.code === errorCodes.OPERATION_CANCELED) {
            return;
          }
          console.error('File pick error:', pickErr);
          Alert.alert('Selection Error', 'Could not open or read the selected file.');
        }
      }
    } catch (err: any) {
      console.error('Upload source error:', err);
      Alert.alert('Error', 'Unable to open camera or files.');
    }
  };

  const handleDeleteDoc = (category: DocCategory, docId?: string) => {
    Alert.alert(
      t('confirmDeleteTitle'),
      t('confirmDeleteMsg'),
      [
        { text: t('cancelBtn'), style: 'cancel' },
        {
          text: t('confirmDeleteBtn'),
          style: 'destructive',
          onPress: () => {
            if (category === 'aadhaar') {
              setAadhaarDoc(null);
            } else if (category === 'income') {
              setIncomeDoc(null);
            } else if (category === 'ration') {
              setRationCardDoc(null);
            } else if (category === 'referral') {
              setReferralDoc(null);
            } else if (category === 'abha') {
              setAbhaDoc(null);
            } else if (category === 'pmjay') {
              setPmjayDoc(null);
            } else if (category === 'other') {
              setOtherDoc(null);
            } else if (category === 'medical' && docId) {
              setMedicalDocs((prev) => prev.filter((d) => d.id !== docId));
            }
          },
        },
      ]
    );
  };

  const handleSmartBack = useCallback((): boolean => {
    // 0. If submitting, block back action to prevent state corruption
    if (isSubmitting) {
      return true;
    }

    // 1. If any modal or popup is open, dismiss it first
    if (draftPromptVisible) {
      setDraftPromptVisible(false);
      return true;
    }
    if (previewDoc) {
      setPreviewDoc(null);
      return true;
    }
    if (uploadPickerVisible) {
      setUploadPickerVisible(false);
      return true;
    }
    if (dobPickerVisible) {
      setDobPickerVisible(false);
      return true;
    }
    if (relationModalVisible) {
      setRelationModalVisible(false);
      return true;
    }
    if (recommenderTypeModalVisible) {
      setRecommenderTypeModalVisible(false);
      return true;
    }
    if (districtModalVisible) {
      setDistrictModalVisible(false);
      return true;
    }
    if (talukaModalVisible) {
      setTalukaModalVisible(false);
      return true;
    }
    if (languageConfirmationState?.visible) {
      handleModalClose();
      return true;
    }

    // 2. If already submitted (success confirmation screen), navigate to Citizen Home
    if (isSubmitted) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'CitizenTabs' }],
      });
      return true;
    }

    // 3. If on steps 2, 3, or 4, navigate back one step (e.g. 4 -> 3 -> 2 -> 1)
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as StepNumber);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      return true;
    }

    // 4. If on step 1, navigate back / exit form
    navigation.goBack();
    return true;
  }, [
    isSubmitting,
    draftPromptVisible,
    previewDoc,
    uploadPickerVisible,
    dobPickerVisible,
    relationModalVisible,
    recommenderTypeModalVisible,
    districtModalVisible,
    talukaModalVisible,
    languageConfirmationState?.visible,
    handleModalClose,
    isSubmitted,
    currentStep,
    navigation,
  ]);

  const handleBack = handleSmartBack;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return handleSmartBack();
    });

    return () => subscription.remove();
  }, [handleSmartBack]);

  const handleProceed = () => {
    if (currentStep === 1 && isStep1Valid) {
      setCurrentStep(2);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } else if (currentStep === 2 && isStep2Valid) {
      // Language mismatch confirmation prompt disabled as requested
      // checkAndConfirmLanguage(medicalCauseNote, () => setCurrentStep(3));
      setCurrentStep(3);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } else if (currentStep === 3 && isStep3Valid) {
      setCurrentStep(4);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const getFullAddressFormatted = () => {
    const parts = [address.trim(), villageCity.trim(), taluka.trim(), district.trim(), pincode.trim()].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'नागपूर रोड, पुणे (Pune)';
  };

  const getRecommenderTypeDisplayName = () => {
    if (!selectedRecommenderType) return '';
    if (selectedRecommenderType === 'other') {
      return customRecommenderType.trim() || t('recommenderTypeOther');
    }
    const found = RECOMMENDER_TYPE_OPTIONS.find((o) => o.key === selectedRecommenderType);
    return found ? (t as any)(found.labelKey) : selectedRecommenderType;
  };

  const getFullReferralNameFormatted = () => {
    const rawName = referralFullName.trim() || [referralFirstName.trim(), referralLastName.trim()].filter(Boolean).join(' ');
    const typeTitle = getRecommenderTypeDisplayName();
    if (typeTitle && rawName) {
      return `${typeTitle} - ${rawName}`;
    }
    return rawName || typeTitle || '';
  };

  const handleSubmit = async () => {
    try {
      const allDocs: UploadedDoc[] = [];
      if (aadhaarDoc) allDocs.push(aadhaarDoc);
      if (incomeDoc) allDocs.push(incomeDoc);
      if (rationCardDoc) allDocs.push(rationCardDoc);
      if (referralDoc) allDocs.push(referralDoc);
      if (abhaDoc) allDocs.push(abhaDoc);
      if (pmjayDoc) allDocs.push(pmjayDoc);
      if (otherDoc) allDocs.push(otherDoc);
      if (medicalDocs.length > 0) allDocs.push(...medicalDocs);

      if (isSubmitting) return;
      setIsSubmitting(true);

      const finalPatientName = applyingFor === 'self' ? (patientName || user?.name || 'नागरिक') : patientName;
      const finalPatientPhone = applyingFor === 'self' ? (patientPhone || user?.phoneNumber?.replace('+91', '') || '') : patientPhone;

      let realCaseId = '';

      // Ensure all documents have valid remote S3 URLs before sending payload
      const processedDocs: any[] = [];
      for (const d of allDocs) {
        let finalRemoteUrl = (d.file_url && (d.file_url.startsWith('http://') || d.file_url.startsWith('https://')))
          ? d.file_url
          : (d.uri && (d.uri.startsWith('http://') || d.uri.startsWith('https://')))
            ? d.uri
            : '';

        if (!finalRemoteUrl && d.uri) {
          try {
            finalRemoteUrl = await uploadDocumentToS3(
              d.uri,
              d.name,
              d.type || 'image/jpeg',
              d.category
            );
          } catch (upErr) {
            console.warn(`[NewApplicationScreen] Submit upload fallback for ${d.name}:`, upErr);
          }
        }
        processedDocs.push({
          id: d.id,
          name: d.name,
          file_url: finalRemoteUrl || d.uri,
          uri: finalRemoteUrl || d.uri,
          size: d.size,
          category: d.category,
          source: d.source,
          type: d.type,
          timestamp: d.timestamp,
        });
      }

      // 1. Send Application to Backend API (POST /api/applications)
      try {
        const canonicalDistrict = locationDirectoryService.getCanonicalDistrict(district) || district.trim() || 'Pune';
        const districtId = locationDirectoryService.getDistrictId(district) || 'MH-PUN';
        const canonicalTaluka = locationDirectoryService.getCanonicalTaluka(district, taluka) || taluka.trim() || undefined;
        const talukaId = locationDirectoryService.getTalukaId(district, taluka) || undefined;

        const parsedAge = age.trim() ? parseInt(age.trim(), 10) : (user?.dob ? parseInt(calculateAgeFromDob(user.dob), 10) || undefined : undefined);

        const apiPayload: ApplicationSubmitPayload = {
          patientName: finalPatientName,
          contactMobile: finalPatientPhone,
          patientPhone: finalPatientPhone,
          age: !isNaN(parsedAge as any) ? parsedAge : undefined,
          gender: gender || 'male',
          applyingFor,
          priority: (priority === 'emergency' || priority === 'critical' || (priority as any) === 'EMERGENCY' || (priority as any) === 'CRITICAL') ? 'EMERGENCY' : 'REGULAR',
          abhaNumber: abhaNumber.trim() || undefined,
          pmjayCardNumber: pmjayCardNumber.trim() || undefined,
          address: getFullAddressFormatted(),
          villageCity: villageCity.trim() || undefined,
          taluka: canonicalTaluka,
          taluka_id: talukaId,
          district: canonicalDistrict,
          district_id: districtId,
          pincode: pincode.trim() || undefined,
          relativeName: relativeName.trim() || undefined,
          relativePhone: relativePhone.trim() || undefined,
          relativeRelation: relativeRelation.trim() || undefined,
          treatmentType: (treatmentType || 'opd').toUpperCase(),
          hospitalName: treatmentType === 'ipd' ? hospitalName.trim() : undefined,
          suggested_scheme_id: selectedScheme,
          suggested_scheme_name: getSchemeName(),
          medicalCauseNote: medicalCauseNote.trim() || undefined,
          referralType: selectedRecommenderType || undefined,
          referralCustomType: selectedRecommenderType === 'other' ? customRecommenderType.trim() || undefined : undefined,
          referralName: referralFullName.trim() || [referralFirstName.trim(), referralLastName.trim()].filter(Boolean).join(' ') || undefined,
          referralFullName: referralFullName.trim() || [referralFirstName.trim(), referralLastName.trim()].filter(Boolean).join(' ') || undefined,
          referralFirstName: referralFullName.trim().split(' ')[0] || referralFirstName.trim() || undefined,
          referralLastName: referralFullName.trim().split(' ').slice(1).join(' ') || referralLastName.trim() || undefined,
          referredBy: getFullReferralNameFormatted() || undefined,
          documents: processedDocs,
          remarks: remarks.trim() || undefined,
        };

        const res = await applicationApi.createApplication(apiPayload);
        console.log('[NewApplicationScreen] Application API response:', res);

        if (res.success && res.data) {
          realCaseId = res.data.caseId || res.data.applicationNumber || res.data.id || '';
          console.log('[NewApplicationScreen] Successfully submitted to backend with official Case ID:', realCaseId);
        } else {
          setIsSubmitting(false);
          const errorMsg = res.message || (res.errors ? (Array.isArray(res.errors) ? res.errors.map((e: any) => e.message || e).join('\n') : JSON.stringify(res.errors)) : 'Unable to submit application to the server.');
          
          if (res.statusCode === 401) {
            Alert.alert(
              'Session Expired',
              'Your login token is invalid or expired. Please log in again to submit your application.'
            );
          } else {
            Alert.alert('Submission Error / अर्ज सबमिशन त्रुटी', errorMsg);
          }
          return;
        }
      } catch (apiErr: any) {
        setIsSubmitting(false);
        console.error('[NewApplicationScreen] Backend API submission exception:', apiErr);
        Alert.alert(
          'Network Error / नेटवर्क त्रुटी',
          apiErr?.message || 'Unable to connect to ArogyaMitra server. Please verify your connection and try again.'
        );
        return;
      }

      if (!realCaseId) {
        setIsSubmitting(false);
        Alert.alert('Submission Error', 'Failed to receive official Case ID from server. Please try again.');
        return;
      }

      const finalAppId = realCaseId;
      setApplicationId(finalAppId);

      // 2. Persist to local applicationStore for offline access & instant UI update
      await applicationStore.addApplication({
        id: finalAppId,
        schemeId: selectedScheme,
        schemeName: getSchemeName(),
        applyingFor,
        priority: (priority === 'emergency' || priority === 'critical') ? 'emergency' : 'regular',
        abhaNumber: abhaNumber.trim() || undefined,
        pmjayCardNumber: pmjayCardNumber.trim() || undefined,
        patientName: finalPatientName,
        patientPhone: finalPatientPhone,
        age,
        gender,
        contactMobile: finalPatientPhone,
        address: getFullAddressFormatted(),
        villageCity,
        taluka,
        district,
        pincode,
        relativeName,
        relativePhone,
        relativeRelation,
        treatmentType,
        hospitalName: treatmentType === 'ipd' ? hospitalName : undefined,
        medicalCauseNote,
        referralType: selectedRecommenderType || undefined,
        referralCustomType: selectedRecommenderType === 'other' ? customRecommenderType.trim() || undefined : undefined,
        referralFullName: referralFullName.trim() || [referralFirstName.trim(), referralLastName.trim()].filter(Boolean).join(' ') || undefined,
        referralFirstName: referralFullName.trim().split(' ')[0] || referralFirstName.trim() || undefined,
        referralLastName: referralFullName.trim().split(' ').slice(1).join(' ') || referralLastName.trim() || undefined,
        referredBy: getFullReferralNameFormatted(),
        documents: processedDocs,
        remarks,
      });

      // Clear local draft upon successful application submission
      await storage.removeItem(APP_CONFIG.STORAGE_KEYS.APPLICATION_DRAFT);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error persisting application:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return t('stepScheme');
      case 2:
        return t('stepInfo');
      case 3:
        return t('stepDocs');
      case 4:
        return t('stepReview');
    }
  };

  const getSchemeName = () => {
    const item = dynamicSchemes.find((s) => s.id === selectedScheme);
    if (!item) return selectedScheme;
    return item.name;
  };

  const renderSummaryDocRow = (label: string, doc: UploadedDoc) => {
    const docUrl = (doc.file_url && (doc.file_url.startsWith('http://') || doc.file_url.startsWith('https://')))
      ? doc.file_url
      : (doc.uri && (doc.uri.startsWith('http://') || doc.uri.startsWith('https://')))
        ? doc.uri
        : '';

    return (
      <View key={doc.id} style={styles.summaryDocCardItem}>
        <View style={styles.summaryDocItemTopRow}>
          <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
          <Text style={styles.summaryDocItemText}>
            {label}: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{doc.name}</Text>
          </Text>
        </View>
        {docUrl ? (
          <TouchableOpacity
            style={styles.summaryDocLinkRow}
            activeOpacity={0.8}
            onPress={() => Linking.openURL(docUrl)}
          >
            <Ionicons name="cloud-done" size={13} color="#059669" />
            <Text style={styles.summaryDocLinkUrl} numberOfLines={1} ellipsizeMode="middle">
              {docUrl}
            </Text>
            <View style={styles.summaryOpenTag}>
              <Text style={styles.summaryOpenTagText}>Open</Text>
              <Ionicons name="open-outline" size={10} color="#15803D" />
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderCompactDocCard = (
    doc: UploadedDoc,
    category: DocCategory
  ) => {
    const isDocPdf = doc.name.toLowerCase().endsWith('.pdf') || (doc.type && doc.type.includes('pdf'));
    const docUrl = (doc.file_url && (doc.file_url.startsWith('http://') || doc.file_url.startsWith('https://')))
      ? doc.file_url
      : (doc.uri && (doc.uri.startsWith('http://') || doc.uri.startsWith('https://')))
        ? doc.uri
        : '';
    const pdfThumbUrl = isDocPdf && docUrl ? docUrl.replace(/\.pdf$/i, '.jpg') : null;
    const isImage = !isDocPdf && ((doc.type && doc.type.startsWith('image/')) || (doc.uri && (doc.uri.startsWith('data:image/') || doc.uri.startsWith('file://') || doc.uri.startsWith('http'))));

    return (
      <View key={doc.id} style={styles.compactDocCardWrapper}>
        <View style={styles.compactDocCard}>
          <TouchableOpacity
            style={styles.compactDocLeft}
            activeOpacity={doc.uploading ? 1 : 0.7}
            onPress={() => {
              if (!doc.uploading) setPreviewDoc(doc);
            }}
          >
            <View style={[styles.compactDocIconBox, !doc.uploading && styles.compactDocIconBoxUploaded]}>
              {doc.uploading ? (
                <ActivityIndicator size="small" color="#0A5C53" />
              ) : pdfThumbUrl ? (
                <Image source={{ uri: pdfThumbUrl }} style={styles.compactDocThumbnail} resizeMode="cover" />
              ) : isImage && doc.uri ? (
                <Image source={{ uri: doc.uri }} style={styles.compactDocThumbnail} resizeMode="cover" />
              ) : (
                <Ionicons
                  name={isDocPdf ? 'document-text' : 'image'}
                  size={18}
                  color="#0A5C53"
                />
              )}
            </View>
            <View style={styles.compactDocTextCol}>
              <Text style={styles.compactDocName} numberOfLines={1} ellipsizeMode="middle">
                {doc.name}
              </Text>
              <Text style={[styles.compactDocMeta, doc.uploading && { color: '#0A5C53', fontWeight: '600' }]}>
                {doc.uploading
                  ? 'Uploading to S3... / क्लाउडवर अपलोड होत आहे...'
                  : `${doc.size} • ${doc.source === 'camera' ? t('clickPhoto') : t('uploadFromDevice')} • ${doc.timestamp}`}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.compactDocActions}>
            {!doc.uploading && (
              <TouchableOpacity
                style={styles.compactActionIconBtn}
                activeOpacity={0.7}
                onPress={() => setPreviewDoc(doc)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="eye-outline" size={17} color="#0A5C53" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.compactActionIconBtn}
              activeOpacity={0.7}
              onPress={() => openUploadPicker(category, doc.id)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="swap-vertical-outline" size={17} color="#0284C7" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.compactActionIconBtn, styles.compactActionDeleteBtn]}
              activeOpacity={0.7}
              onPress={() => handleDeleteDoc(category, doc.id)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={17} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* S3 Live Link for Testing Verification */}
        {docUrl ? (
          <View style={styles.s3LinkBar}>
            <View style={styles.s3LinkBarLeft}>
              <Ionicons name="cloud-done" size={14} color="#15803D" />
              <Text style={styles.s3LinkBarTitle}>S3 Link:</Text>
              <Text style={styles.s3LinkBarUrl} numberOfLines={1} ellipsizeMode="middle">
                {docUrl}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.s3OpenPill}
              activeOpacity={0.75}
              onPress={() => Linking.openURL(docUrl)}
            >
              <Ionicons name="open-outline" size={12} color="#15803D" />
              <Text style={styles.s3OpenPillText}>Open / उघडा</Text>
            </TouchableOpacity>
          </View>
        ) : doc.uploading ? (
          <View style={styles.s3PendingBar}>
            <ActivityIndicator size="small" color="#B45309" />
            <Text style={styles.s3PendingBarText}>
              Uploading directly to S3 cloud storage...
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  // SUCCESS CONFIRMATION VIEW
  if (isSubmitted) {
    return (
      <View style={[styles.container, { paddingTop: topInset + 40, paddingBottom: bottomInset + 16, backgroundColor: '#FFFFFF' }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successScreenWrapper}>
          <View style={styles.successTopContent}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={42} color="#FFFFFF" />
            </View>

            <Text style={styles.successHeading}>{t('applicationSuccess')}</Text>
            <Text style={styles.successSubtext}>{t('applicationSuccessSub')}</Text>

            <View style={styles.caseIdCard}>
              <Text style={styles.caseIdLabel}>{t('yourCaseId')}</Text>
              <Text style={styles.caseIdValue}>{applicationId}</Text>
            </View>

            <Text style={styles.caseIdSafeNote}>{t('keepIdSafeNote')}</Text>
          </View>

          <TouchableOpacity
            style={styles.backToHomePrimaryBtn}
            activeOpacity={0.88}
            onPress={() => {
              navigation.replace('TrackApplications');
            }}
          >
            <Text style={styles.backToHomePrimaryBtnText}>{t('trackAppTitle')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backToHomePrimaryBtn, { backgroundColor: '#F1F5F9', marginTop: 10 }]}
            activeOpacity={0.88}
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'CitizenTabs' }],
              });
            }}
          >
            <Text style={[styles.backToHomePrimaryBtnText, { color: '#0F172A' }]}>{t('backToHomeBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={[styles.headerContainer, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButtonBox}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#0A5C53" />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>{getStepTitle()}</Text>
        </View>

        {/* 4-Step Progress Segments */}
        <View style={styles.progressSegmentsRow}>
          {[1, 2, 3, 4].map((stepNum) => {
            const isFilled = stepNum <= currentStep;
            return (
              <View
                key={stepNum}
                style={[
                  styles.progressSegment,
                  isFilled && styles.progressSegmentFilled,
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.stepSubtitleText}>
          {t('stepOf')} {currentStep} / 4 · {t('autoSaved')}
        </Text>
      </View>

      {/* Main Content Area with Keyboard Scroll */}
      <KeyboardAvoidingView
        style={styles.bodyContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingSchemes}
              onRefresh={() => refreshSchemes(true)}
              colors={['#0A5C53']}
              tintColor="#0A5C53"
            />
          }
        >
          {/* ═════════════════ STEP 1: योजना (Scheme Selection) ═════════════════ */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.step1HeaderRow}>
                <Text style={styles.questionText}>{t('whichSchemeQuestion')}</Text>
                <TouchableOpacity
                  style={styles.refreshSchemesBtn}
                  onPress={() => refreshSchemes(true)}
                  activeOpacity={0.7}
                  disabled={isRefreshingSchemes}
                >
                  <Ionicons
                    name="refresh"
                    size={14}
                    color="#0A5C53"
                    style={isRefreshingSchemes ? { opacity: 0.5 } : undefined}
                  />
                  <Text style={styles.refreshSchemesBtnText}>
                    {isRefreshingSchemes ? 'Refreshing...' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isLoadingSchemes ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#0A5C53" />
                  <Text style={{ marginTop: 8, color: '#64748B', fontSize: 13 }}>
                    Loading available schemes...
                  </Text>
                </View>
              ) : (
                <View style={styles.schemeOptionsList}>
                  {dynamicSchemes.map((item) => {
                    const isSelected = selectedScheme === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.schemeCard,
                          item.isDashed && styles.schemeCardDashed,
                          isSelected && styles.schemeCardSelected,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedScheme(item.id)}
                      >
                        <View style={styles.schemeIconBox}>
                          <Ionicons
                            name={item.icon as any}
                            size={22}
                            color={isSelected ? '#0A5C53' : '#64748B'}
                          />
                        </View>

                        <View style={styles.schemeTextCol}>
                          <Text
                            style={[
                              styles.schemeTitle,
                              isSelected && styles.schemeTitleSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.schemeSubtitle}>{item.subtitle}</Text>
                        </View>

                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioInnerDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ═════════════════ STEP 2: माहिती (Patient Information & Details) ═════════════════ */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>

              {/* 1. APPLYING FOR SELECTOR (Self vs Relative) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('applyingForLabel')}</Text>
                <View style={styles.segmentedRow}>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      applyingFor === 'self' && styles.segmentBtnActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectApplyingFor('self')}
                  >
                    <Ionicons name="person" size={16} color={applyingFor === 'self' ? '#0A5C53' : '#64748B'} style={{ marginRight: 6 }} />
                    <Text
                      style={[
                        styles.segmentBtnText,
                        applyingFor === 'self' && styles.segmentBtnTextActive,
                      ]}
                    >
                      {t('applySelf')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      applyingFor === 'relative' && styles.segmentBtnActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectApplyingFor('relative')}
                  >
                    <Ionicons name="people" size={16} color={applyingFor === 'relative' ? '#0A5C53' : '#64748B'} style={{ marginRight: 6 }} />
                    <Text
                      style={[
                        styles.segmentBtnText,
                        applyingFor === 'relative' && styles.segmentBtnTextActive,
                      ]}
                    >
                      {t('applyRelative')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Informational Banner depending on selection */}
              {applyingFor === 'self' ? (
                <View style={[styles.infoNoticeCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                  <Text style={[styles.infoNoticeText, { color: '#15803D', fontWeight: '600' }]}>
                    {t('selfProfileNotice')}
                  </Text>
                </View>
              ) : (
                <View style={[styles.infoNoticeCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Ionicons name="information-circle" size={20} color="#1D4ED8" />
                  <Text style={[styles.infoNoticeText, { color: '#1E40AF' }]}>
                    {t('relativeNotice')}
                  </Text>
                </View>
              )}

              {/* 2. APPLICATION PRIORITY SELECTOR */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('priorityLabel')}</Text>
                <View style={styles.priorityGrid}>
                  {(['emergency', 'regular'] as ApplicationPriority[]).map((p) => {
                    const isSelected = priority === p || (p === 'emergency' && (priority === 'critical' || (priority as any) === 'EMERGENCY')) || (p === 'regular' && (priority === 'high' || priority === 'medium' || priority === 'low' || (priority as any) === 'REGULAR'));
                    const isEmergency = p === 'emergency';
                    const activeBg = isEmergency ? '#FEF2F2' : '#E8F4F2';
                    const activeBorder = isEmergency ? '#EF4444' : '#0A5C53';
                    const activeTextColor = isEmergency ? '#DC2626' : '#0A5C53';

                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityChip,
                          { minWidth: '45%', flex: 1 },
                          isSelected && { backgroundColor: activeBg, borderColor: activeBorder },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setPriority(p)}
                      >
                        <View style={[styles.priorityDot, { backgroundColor: isSelected ? activeTextColor : '#94A3B8' }]} />
                        <Text style={[styles.priorityChipText, isSelected && { color: activeTextColor, fontWeight: '800' }]}>
                          {p === 'emergency' ? t('priorityEmergency') : t('priorityRegular')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. CONDITIONAL FIELDS: SELF vs RELATIVE */}
              {applyingFor === 'self' ? (
                <View key="mode-self-wrapper" style={{ width: '100%', flexDirection: 'column' }}>
                  {/* FOR SELF: Only ask for Age / DOB (Gender is auto-linked from registration) */}
                  <View key="self-age-gender-card" style={styles.formSectionBox}>
                    <Text style={styles.formSectionHeading}>
                      <Ionicons name="medical" size={16} color="#0A5C53" /> {t('patientAgeGenderSection')}
                    </Text>

                    {/* Self Patient DOB */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelContainer}>
                        <Text style={styles.inputLabel}>{t('dobLabel')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                      </View>
                      <View style={styles.dobInputWrapper}>
                        <TouchableOpacity
                          onPress={() => setDobPickerVisible(true)}
                          style={styles.calendarIconBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="calendar" size={19} color="#0A5C53" />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.dobTextInput}
                          placeholder={t('dobPlaceholder') || 'DD/MM/YYYY'}
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={10}
                          value={patientDob}
                          onChangeText={handlePatientDobChange}
                        />
                        <TouchableOpacity
                          style={styles.pickDateBtn}
                          onPress={() => setDobPickerVisible(true)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.pickDateBtnText}>
                            {language === 'mr' ? 'तारीख निवडा' : language === 'hi' ? 'तिथि चुनें' : 'Select'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>
                            {t('age')} <Text style={styles.mandatoryAsterisk}>*</Text>
                            {Boolean(age && patientDob) && <Text style={styles.autoCalcBadgeText}> ({t('autoCalculated')})</Text>}
                          </Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('agePlaceholder')}
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={3}
                          value={age}
                          onChangeText={setAge}
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1.2, marginLeft: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('gender')}</Text>
                        </View>
                        <View style={styles.autoGenderBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#0A5C53" style={{ marginRight: 6 }} />
                          <Text style={styles.autoGenderBadgeText}>
                            {gender === 'female' ? t('genderFemale') : gender === 'other' ? t('genderOther') : t('genderMale')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* FOR SELF: RELATIVE / EMERGENCY CONTACT DETAILS CARD */}
                  <View key="self-relative-contact-card" style={styles.formSectionBox}>
                    <Text style={styles.formSectionHeading}>
                      <Ionicons name="people-circle" size={16} color="#0A5C53" /> {t('relativeContactSection')}
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {t('relationWithPatient')} <Text style={styles.mandatoryAsterisk}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.dropdownTrigger}
                        activeOpacity={0.8}
                        onPress={() => setRelationModalVisible(true)}
                      >
                        <Ionicons name="people-outline" size={18} color="#0A5C53" style={{ marginRight: 10 }} />
                        <Text style={[styles.dropdownTriggerText, !selectedRelationKey && !relativeRelation && styles.placeholderText]}>
                          {selectedRelationKey
                            ? selectedRelationKey === 'other'
                              ? customRelationText || t('relOther')
                              : (RELATION_OPTIONS.find(o => o.key === selectedRelationKey)
                                ? (t as any)(RELATION_OPTIONS.find(o => o.key === selectedRelationKey)!.labelKey)
                                : relativeRelation || selectedRelationKey)
                            : (relativeRelation || t('selectRelationPlaceholder'))}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color="#64748B" />
                      </TouchableOpacity>

                      {selectedRelationKey === 'other' && (
                        <View key="custom-rel-self-input" style={{ marginTop: 10 }}>
                          <Text style={styles.inputLabel}>
                            {t('specifyCustomRelation')} <Text style={styles.mandatoryAsterisk}>*</Text>
                          </Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder={t('specifyCustomRelationPlaceholder')}
                            placeholderTextColor="#94A3B8"
                            value={customRelationText}
                            onChangeText={handleCustomRelationChange}
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('relativeNameLabel')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('relativeNamePlaceholder')}
                          placeholderTextColor="#94A3B8"
                          value={relativeName}
                          onChangeText={setRelativeName}
                        />
                      </View>

                      <View style={[styles.inputGroup, { flex: 1, marginLeft: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('relativePhoneLabel')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder="10-digit mobile"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={relativePhone}
                          onChangeText={setRelativePhone}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View key="mode-relative-wrapper" style={{ width: '100%', flexDirection: 'column' }}>
                  {/* FOR RELATIVE: 1. FULL PATIENT DETAILS CARD FIRST */}
                  <View key="rel-patient-info-card" style={styles.formSectionBox}>
                    <Text style={styles.formSectionHeading}>
                      <Ionicons name="medical" size={16} color="#0A5C53" /> {t('patientFullDetailsSection')}
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {t('patientFullName')} <Text style={styles.mandatoryAsterisk}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder={t('patientNamePlaceholder')}
                        placeholderTextColor="#94A3B8"
                        value={patientName}
                        onChangeText={setPatientName}
                      />
                    </View>

                    {/* Relative Patient DOB with DatePicker */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelContainer}>
                        <Text style={styles.inputLabel}>{t('dobLabel')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                      </View>
                      <View style={styles.dobInputWrapper}>
                        <TouchableOpacity
                          onPress={() => setDobPickerVisible(true)}
                          style={styles.calendarIconBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="calendar" size={19} color="#0A5C53" />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.dobTextInput}
                          placeholder={t('dobPlaceholder') || 'DD/MM/YYYY'}
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={10}
                          value={patientDob}
                          onChangeText={handlePatientDobChange}
                        />
                        <TouchableOpacity
                          style={styles.pickDateBtn}
                          onPress={() => setDobPickerVisible(true)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.pickDateBtnText}>
                            {language === 'mr' ? 'तारीख निवडा' : language === 'hi' ? 'तिथि चुनें' : 'Select'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>
                            {t('age')} <Text style={styles.mandatoryAsterisk}>*</Text>
                            {Boolean(age && patientDob) && <Text style={styles.autoCalcBadgeText}> ({t('autoCalculated')})</Text>}
                          </Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('agePlaceholder')}
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={3}
                          value={age}
                          onChangeText={setAge}
                        />
                      </View>

                      <View style={[styles.inputGroup, { flex: 1.2, marginLeft: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('patientPhoneLabel')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder="10-digit mobile"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={patientPhone}
                          onChangeText={setPatientPhone}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('gender')}</Text>
                      <View style={styles.segmentedRow}>
                        <TouchableOpacity
                          style={[
                            styles.segmentBtn,
                            { marginRight: 4 },
                            gender === 'male' && styles.segmentBtnActive,
                          ]}
                          onPress={() => setGender('male')}
                        >
                          <Text style={[styles.segmentBtnText, gender === 'male' && styles.segmentBtnTextActive]}>{t('genderMale')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.segmentBtn,
                            { marginHorizontal: 4 },
                            gender === 'female' && styles.segmentBtnActive,
                          ]}
                          onPress={() => setGender('female')}
                        >
                          <Text style={[styles.segmentBtnText, gender === 'female' && styles.segmentBtnTextActive]}>{t('genderFemale')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.segmentBtn,
                            { marginLeft: 4 },
                            gender === 'other' && styles.segmentBtnActive,
                          ]}
                          onPress={() => setGender('other')}
                        >
                          <Text style={[styles.segmentBtnText, gender === 'other' && styles.segmentBtnTextActive]}>{t('genderOther')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* FOR RELATIVE: 2. PATIENT ADDRESS BREAKDOWN CARD SECOND */}
                  <View key="rel-patient-address-card" style={styles.formSectionBox}>
                    <Text style={styles.formSectionHeading}>
                      <Ionicons name="location" size={16} color="#0A5C53" /> {t('patientAddressSection')}
                    </Text>

                    {/* Cascading Location: District & Taluka */}
                    <View style={styles.twoColRow}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('district')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.dropdownTrigger, { justifyContent: 'space-between' }]}
                          activeOpacity={0.7}
                          onPress={() => setDistrictModalVisible(true)}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: district ? '#0F172A' : '#94A3B8',
                              fontWeight: district ? '600' : '400',
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {district
                              ? locationDirectoryService.resolveDistrictDisplay(district, language)
                              : t('districtPlaceholder')}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.inputGroup, { flex: 1, marginLeft: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('taluka')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.dropdownTrigger,
                            { justifyContent: 'space-between' },
                            !district && { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
                          ]}
                          activeOpacity={!district ? 1 : 0.7}
                          onPress={() => {
                            if (district) setTalukaModalVisible(true);
                          }}
                          disabled={!district}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: !district ? '#94A3B8' : taluka ? '#0F172A' : '#94A3B8',
                              fontWeight: taluka ? '600' : '400',
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {!district
                              ? 'Select District First'
                              : taluka
                                ? locationDirectoryService.resolveTalukaDisplay(taluka, language)
                                : t('talukaPlaceholder')}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={!district ? '#CBD5E1' : '#64748B'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Village / City & Pincode */}
                    <View style={styles.twoColRow}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('villageCity')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('villageCityPlaceholder')}
                          placeholderTextColor="#94A3B8"
                          value={villageCity}
                          onChangeText={setVillageCity}
                        />
                      </View>

                      <View style={[styles.inputGroup, { flex: 1, marginLeft: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('pincode')} <Text style={styles.optionalLabel}>({t('optionalTag')})</Text></Text>
                        </View>
                        <TextInput
                          style={[
                            styles.textInput,
                            !taluka && { backgroundColor: '#F1F5F9', color: '#94A3B8' },
                          ]}
                          placeholder={!taluka ? 'Select Taluka' : t('pincodePlaceholder')}
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={6}
                          editable={!!taluka}
                          value={pincode}
                          onChangeText={handlePincodeChange}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('fullStreetAddress')}</Text>
                      <TextInput
                        style={[styles.textInput, styles.textArea]}
                        placeholder={t('addressPlaceholder')}
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={2}
                        value={address}
                        onChangeText={setAddress}
                      />
                    </View>
                  </View>

                  {/* FOR RELATIVE: 3. RELATIVE / EMERGENCY CONTACT CARD THIRD (DEFAULT CITIZEN NAME & PHONE) */}
                  <View key="rel-emergency-contact-card" style={styles.formSectionBox}>
                    <Text style={styles.formSectionHeading}>
                      <Ionicons name="people-circle" size={16} color="#0A5C53" /> {t('relativeContactSection')}
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {t('relationWithPatient')} <Text style={styles.mandatoryAsterisk}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.dropdownTrigger}
                        activeOpacity={0.8}
                        onPress={() => setRelationModalVisible(true)}
                      >
                        <Ionicons name="people-outline" size={18} color="#0A5C53" style={{ marginRight: 10 }} />
                        <Text style={[styles.dropdownTriggerText, !selectedRelationKey && !relativeRelation && styles.placeholderText]}>
                          {selectedRelationKey
                            ? selectedRelationKey === 'other'
                              ? customRelationText || t('relOther')
                              : (RELATION_OPTIONS.find(o => o.key === selectedRelationKey)
                                ? (t as any)(RELATION_OPTIONS.find(o => o.key === selectedRelationKey)!.labelKey)
                                : relativeRelation || selectedRelationKey)
                            : (relativeRelation || t('selectRelationPlaceholder'))}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color="#64748B" />
                      </TouchableOpacity>

                      {selectedRelationKey === 'other' && (
                        <View key="custom-rel-relative-input" style={{ marginTop: 10 }}>
                          <Text style={styles.inputLabel}>
                            {t('specifyCustomRelation')} <Text style={styles.mandatoryAsterisk}>*</Text>
                          </Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder={t('specifyCustomRelationPlaceholder')}
                            placeholderTextColor="#94A3B8"
                            value={customRelationText}
                            onChangeText={handleCustomRelationChange}
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('relativeNameLabel')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('relativeNamePlaceholder')}
                          placeholderTextColor="#94A3B8"
                          value={relativeName}
                          onChangeText={setRelativeName}
                        />
                      </View>

                      <View style={[styles.inputGroup, { flex: 1, marginLeft: 6, marginBottom: 0 }]}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>{t('relativePhoneLabel')} <Text style={styles.mandatoryAsterisk}>*</Text></Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder="10-digit mobile"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={relativePhone}
                          onChangeText={setRelativePhone}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* SECTION: TREATMENT TYPE & HOSPITAL NAME */}
              <View key="treatment-details-card" style={styles.formSectionBox}>
                <Text style={styles.formSectionHeading}>
                  <Ionicons name="bed" size={16} color="#0A5C53" /> {t('treatmentSectionTitle')}
                </Text>

                {/* Redesigned Treatment Type Cards (OPD & IPD) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('treatmentType')}</Text>
                  <View style={styles.treatmentCardsContainer}>
                    {/* OPD Option Card */}
                    <TouchableOpacity
                      style={[
                        styles.treatmentCard,
                        treatmentType === 'opd' && styles.treatmentCardActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setTreatmentType('opd')}
                    >
                      <View style={[styles.treatmentIconBox, treatmentType === 'opd' && styles.treatmentIconBoxActive]}>
                        <Ionicons name="medical-outline" size={20} color={treatmentType === 'opd' ? '#0A5C53' : '#64748B'} />
                      </View>
                      <Text style={[styles.treatmentCardTitle, treatmentType === 'opd' && styles.treatmentCardTitleActive]}>
                        {t('treatmentOpd')}
                      </Text>
                      <Ionicons
                        name={treatmentType === 'opd' ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={treatmentType === 'opd' ? '#0A5C53' : '#94A3B8'}
                      />
                    </TouchableOpacity>

                    {/* IPD Option Card */}
                    <TouchableOpacity
                      style={[
                        styles.treatmentCard,
                        treatmentType === 'ipd' && styles.treatmentCardActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setTreatmentType('ipd')}
                    >
                      <View style={[styles.treatmentIconBox, treatmentType === 'ipd' && styles.treatmentIconBoxActive]}>
                        <Ionicons name="bed-outline" size={20} color={treatmentType === 'ipd' ? '#0A5C53' : '#64748B'} />
                      </View>
                      <Text style={[styles.treatmentCardTitle, treatmentType === 'ipd' && styles.treatmentCardTitleActive]}>
                        {t('treatmentIpd')}
                      </Text>
                      <Ionicons
                        name={treatmentType === 'ipd' ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={treatmentType === 'ipd' ? '#0A5C53' : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* SECTION: MEDICAL ISSUE / CAUSE NOTE (MANDATORY DETAILED NOTE) */}
              <View key="medical-cause-card" style={styles.formSectionBox}>
                <Text style={styles.formSectionHeading}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" /> {t('medicalCauseSectionTitle')} <Text style={styles.mandatoryAsterisk}>*</Text>
                </Text>

                <View style={styles.causeNoticeBanner}>
                  <Ionicons name="document-text" size={18} color="#9A3412" style={{ marginRight: 8 }} />
                  <Text style={styles.causeNoticeText}>{t('medicalCauseNotice')}</Text>
                </View>

                <TextInput
                  style={[styles.textInput, styles.largeNoteArea]}
                  placeholder={t('medicalCausePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  value={medicalCauseNote}
                  onChangeText={setMedicalCauseNote}
                />
              </View>

              {/* SECTION: HEALTH IDENTIFICATION CARDS (ABHA & PMJAY) */}
              <View key="health-cards-section-card" style={styles.formSectionBox}>
                <Text style={styles.formSectionHeading}>
                  <Ionicons name="card" size={16} color="#0A5C53" /> {t('healthIdSectionTitle')} <Text style={styles.optionalLabel}>({t('optionalTag')})</Text>
                </Text>

                {/* 1. ABHA Card Number */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.inputLabel}>{t('abhaCardLabel')}</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      abhaError ? styles.textInputError : null,
                    ]}
                    placeholder={t('abhaCardPlaceholder')}
                    placeholderTextColor="#94A3B8"
                    value={abhaNumber}
                    onChangeText={handleAbhaChange}
                    keyboardType="number-pad"
                    maxLength={17}
                  />
                  {abhaError ? (
                    <Text style={styles.fieldErrorText}>{abhaError}</Text>
                  ) : (
                    <Text style={styles.abhaCardHelpText}>{t('abhaCardHelp')}</Text>
                  )}
                </View>

                {/* 2. PMJAY Card Number */}
                <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.inputLabel}>{t('pmjayCardLabel')}</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      pmjayError ? styles.textInputError : null,
                    ]}
                    placeholder={t('pmjayCardPlaceholder')}
                    placeholderTextColor="#94A3B8"
                    value={pmjayCardNumber}
                    onChangeText={handlePmjayChange}
                    autoCapitalize="characters"
                    maxLength={25}
                  />
                  {pmjayError ? (
                    <Text style={styles.fieldErrorText}>{pmjayError}</Text>
                  ) : (
                    <Text style={styles.abhaCardHelpText}>{t('pmjayCardHelp')}</Text>
                  )}
                </View>
              </View>

              {/* SECTION: REFERRAL / RECOMMENDER DETAILS (DROPDOWN TYPE + FULL NAME) */}
              <View key="referral-details-card" style={styles.formSectionBox}>
                <Text style={styles.formSectionHeading}>
                  <Ionicons name="person-add" size={16} color="#0A5C53" /> {t('referralSectionTitle')} <Text style={styles.optionalLabel}>({t('optionalTag')})</Text>
                </Text>

                {/* 1. Recommender Type Dropdown */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.inputLabel}>{t('recommenderTypeLabel')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    activeOpacity={0.8}
                    onPress={() => setRecommenderTypeModalVisible(true)}
                  >
                    <Ionicons name="ribbon-outline" size={18} color="#0A5C53" style={{ marginRight: 10 }} />
                    <Text style={[styles.dropdownTriggerText, !selectedRecommenderType && styles.placeholderText]}>
                      {selectedRecommenderType
                        ? (selectedRecommenderType === 'other'
                          ? (customRecommenderType ? `${t('recommenderTypeOther')}: ${customRecommenderType}` : t('recommenderTypeOther'))
                          : (RECOMMENDER_TYPE_OPTIONS.find((o) => o.key === selectedRecommenderType)
                            ? (t as any)(RECOMMENDER_TYPE_OPTIONS.find((o) => o.key === selectedRecommenderType)!.labelKey)
                            : selectedRecommenderType))
                        : t('selectRecommenderTypePlaceholder')}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#64748B" />
                  </TouchableOpacity>

                  {/* If 'other' is selected: manual specify input */}
                  {selectedRecommenderType === 'other' && (
                    <View key="custom-recommender-type-input" style={{ marginTop: 10 }}>
                      <Text style={styles.inputLabel}>{t('specifyRecommenderType')}</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder={t('specifyRecommenderTypePlaceholder')}
                        placeholderTextColor="#94A3B8"
                        value={customRecommenderType}
                        onChangeText={setCustomRecommenderType}
                      />
                    </View>
                  )}
                </View>

                {/* 2. Combined Single Full Name Input */}
                <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.inputLabel}>{t('referralFullName')}</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('referralFullNamePlaceholder')}
                    placeholderTextColor="#94A3B8"
                    value={referralFullName}
                    onChangeText={setReferralFullName}
                  />
                </View>
              </View>

            </View>
          )}

          {/* ═════════════════ STEP 3: दस्तऐवज (Documents Upload) ═════════════════ */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              {/* Mandatory Document Warning Banner */}
              <View style={styles.docNoticeBanner}>
                <Ionicons name="shield-checkmark" size={20} color="#0A5C53" />
                <Text style={styles.docNoticeText}>{t('uploadPatientDocsNotice')}</Text>
              </View>

              {/* 1. Aadhaar Card (Mandatory) */}
              <View style={styles.docSection}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docLabelCol}>
                    <Text style={styles.docNameText}>
                      {t('aadhaarCard')} <Text style={styles.mandatoryAsterisk}>*</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.uploadActionBtn,
                      aadhaarDoc && styles.uploadActionBtnUploaded,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('aadhaar')}
                  >
                    <Text
                      style={[
                        styles.uploadActionBtnText,
                        aadhaarDoc && styles.uploadActionBtnTextUploaded,
                      ]}
                    >
                      {aadhaarDoc ? t('uploadedBtn') : t('uploadBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {aadhaarDoc && renderCompactDocCard(aadhaarDoc, 'aadhaar')}
              </View>

              {/* 2. Income Certificate (उत्पन्नाचा दाखला - MANDATORY) */}
              <View style={styles.docSection}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docLabelCol}>
                    <Text style={styles.docNameText}>
                      {t('incomeCertificate')} <Text style={styles.mandatoryAsterisk}>*</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.uploadActionBtn,
                      incomeDoc && styles.uploadActionBtnUploaded,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('income')}
                  >
                    <Text
                      style={[
                        styles.uploadActionBtnText,
                        incomeDoc && styles.uploadActionBtnTextUploaded,
                      ]}
                    >
                      {incomeDoc ? t('uploadedBtn') : t('uploadBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {incomeDoc && renderCompactDocCard(incomeDoc, 'income')}
              </View>

              {/* 3. Medical Report (वैद्यकीय दाखला / रिपोर्ट - MANDATORY) */}
              <View style={styles.docSection}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docLabelCol}>
                    <Text style={styles.docNameText}>
                      {t('medicalReport')} <Text style={styles.mandatoryAsterisk}>*</Text>
                      {medicalDocs.length > 0 && (
                        <Text style={styles.docCountBadge}> ({medicalDocs.length})</Text>
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.uploadActionBtn,
                      medicalDocs.length > 0 && styles.uploadActionBtnUploaded,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('medical')}
                  >
                    <Text
                      style={[
                        styles.uploadActionBtnText,
                        medicalDocs.length > 0 && styles.uploadActionBtnTextUploaded,
                      ]}
                    >
                      {medicalDocs.length > 0 ? t('uploadedBtn') : t('uploadBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {medicalDocs.map((doc) => renderCompactDocCard(doc, 'medical'))}

                {medicalDocs.length > 0 && (
                  <TouchableOpacity
                    style={styles.addMoreDocsBtn}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('medical')}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#0A5C53" />
                    <Text style={styles.addMoreDocsBtnText}>{t('addMoreDocs')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 4. Ration Card (Optional) */}
              <View style={styles.docSection}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docLabelCol}>
                    <Text style={styles.docNameText}>{t('rationCard')}</Text>
                    <Text style={styles.docOptionalText}>{t('optionalTag')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.uploadActionBtn,
                      rationCardDoc && styles.uploadActionBtnUploaded,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('ration')}
                  >
                    <Text
                      style={[
                        styles.uploadActionBtnText,
                        rationCardDoc && styles.uploadActionBtnTextUploaded,
                      ]}
                    >
                      {rationCardDoc ? t('uploadedBtn') : t('uploadBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {rationCardDoc && renderCompactDocCard(rationCardDoc, 'ration')}
              </View>

              {/* 5. ABHA Card (Optional) */}
              <View style={styles.docSection}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docLabelCol}>
                    <Text style={styles.docNameText}>{t('abhaCardDoc')}</Text>
                    <Text style={styles.docOptionalText}>{t('optionalTag')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.uploadActionBtn,
                      abhaDoc && styles.uploadActionBtnUploaded,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('abha')}
                  >
                    <Text
                      style={[
                        styles.uploadActionBtnText,
                        abhaDoc && styles.uploadActionBtnTextUploaded,
                      ]}
                    >
                      {abhaDoc ? t('uploadedBtn') : t('uploadBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {abhaDoc && renderCompactDocCard(abhaDoc, 'abha')}
              </View>

              {/* 6. PMJAY Card (Optional) */}
              <View style={styles.docSection}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docLabelCol}>
                    <Text style={styles.docNameText}>{t('pmjayCardDoc')}</Text>
                    <Text style={styles.docOptionalText}>{t('optionalTag')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.uploadActionBtn,
                      pmjayDoc && styles.uploadActionBtnUploaded,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('pmjay')}
                  >
                    <Text
                      style={[
                        styles.uploadActionBtnText,
                        pmjayDoc && styles.uploadActionBtnTextUploaded,
                      ]}
                    >
                      {pmjayDoc ? t('uploadedBtn') : t('uploadBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {pmjayDoc && renderCompactDocCard(pmjayDoc, 'pmjay')}
              </View>

              {/* 7. Other Documents (Optional) */}
              <View style={styles.docSection}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docLabelCol}>
                    <Text style={styles.docNameText}>{t('otherDocs')}</Text>
                    <Text style={styles.docOptionalText}>{t('optionalTag')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.uploadActionBtn,
                      otherDoc && styles.uploadActionBtnUploaded,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('other')}
                  >
                    <Text
                      style={[
                        styles.uploadActionBtnText,
                        otherDoc && styles.uploadActionBtnTextUploaded,
                      ]}
                    >
                      {otherDoc ? t('uploadedBtn') : t('uploadBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {otherDoc && renderCompactDocCard(otherDoc, 'other')}
              </View>

              {/* 8. Recommendation Letter (शिफारस पत्र - OPTIONAL) */}
              <View style={styles.docSection}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docLabelCol}>
                    <Text style={styles.docNameText}>{t('referralFormDoc')}</Text>
                    <Text style={styles.docOptionalText}>{t('optionalTag')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.uploadActionBtn,
                      referralDoc && styles.uploadActionBtnUploaded,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => openUploadPicker('referral')}
                  >
                    <Text
                      style={[
                        styles.uploadActionBtnText,
                        referralDoc && styles.uploadActionBtnTextUploaded,
                      ]}
                    >
                      {referralDoc ? t('uploadedBtn') : t('uploadBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {referralDoc && renderCompactDocCard(referralDoc, 'referral')}
              </View>

              {/* 6. Remarks (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('remarksOptional')}</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder={t('remarksPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={remarks}
                  onChangeText={setRemarks}
                />
              </View>
            </View>
          )}

          {/* ═════════════════ STEP 4: आढावा (Review & Summary) ═════════════════ */}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.questionText}>{t('checkInfoBeforeSubmit')}</Text>

              {/* Card 1: Scheme & Priority Details */}
              <View style={styles.summaryCard}>
                <Text style={styles.summarySectionTitle}>
                  <Ionicons name="ribbon" size={16} color="#0A5C53" /> {t('schemeDetailsTitle')}
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('reviewScheme')}</Text>
                  <Text style={[styles.summaryVal, styles.summarySchemeVal]}>
                    {getSchemeName()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('priorityLabel')}</Text>
                  <Text style={[styles.summaryVal, { color: (priority === 'emergency' || priority === 'critical') ? '#DC2626' : '#0A5C53' }]}>
                    {(priority === 'emergency' || priority === 'critical') ? t('priorityEmergency') : t('priorityRegular')}
                  </Text>
                </View>
                {abhaNumber.trim().length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('abhaCardLabel')}</Text>
                    <Text style={[styles.summaryVal, { color: '#0A5C53', fontWeight: '800' }]}>{abhaNumber.trim()}</Text>
                  </View>
                )}
                {pmjayCardNumber.trim().length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('pmjayCardLabel')}</Text>
                    <Text style={[styles.summaryVal, { color: '#0A5C53', fontWeight: '800' }]}>{pmjayCardNumber.trim()}</Text>
                  </View>
                )}
              </View>

              {/* Card 2: Patient & Relative Info */}
              <View style={styles.summaryCard}>
                <Text style={styles.summarySectionTitle}>
                  <Ionicons name="person" size={16} color="#0A5C53" /> {t('patientDetailsTitle')}
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('applyingForLabel')}</Text>
                  <Text style={styles.summaryVal}>
                    {applyingFor === 'self' ? t('applySelf') : t('applyRelative')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('reviewName')}</Text>
                  <Text style={styles.summaryVal}>{patientName || user?.name || '-'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('reviewAge')} / {t('gender')}</Text>
                  <Text style={styles.summaryVal}>
                    {age} {t('years')} ({gender === 'male' ? t('genderMale') : gender === 'female' ? t('genderFemale') : t('genderOther')})
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('patientPhoneLabel')}</Text>
                  <Text style={styles.summaryVal}>{patientPhone || user?.phoneNumber || '-'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('relativeRelationLabel')}</Text>
                  <Text style={styles.summaryVal}>
                    {selectedRelationKey === 'other'
                      ? (customRelationText || relativeRelation || '-')
                      : selectedRelationKey
                        ? t(RELATION_OPTIONS.find((o) => o.key === selectedRelationKey)?.labelKey || 'relOther')
                        : (relativeRelation ? relativeRelation.replace(/\s*\([^)]*\)/g, '').trim() : '-')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('relativeNameLabel')}</Text>
                  <Text style={styles.summaryVal}>
                    {relativeName ? `${relativeName} (${relativePhone})` : '-'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('reviewAddress')}</Text>
                  <Text style={styles.summaryVal}>{getFullAddressFormatted()}</Text>
                </View>
              </View>

              {/* Card 3: Treatment & Cause Note Details */}
              <View style={styles.summaryCard}>
                <Text style={styles.summarySectionTitle}>
                  <Ionicons name="medkit" size={16} color="#0A5C53" /> {t('treatmentSectionTitle')}
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('reviewType')}</Text>
                  <Text style={styles.summaryVal}>
                    {treatmentType === 'opd' ? t('treatmentOpd') : t('treatmentIpd')}
                  </Text>
                </View>
                {getFullReferralNameFormatted().length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('referralSectionTitle')}</Text>
                    <Text style={styles.summaryVal}>{getFullReferralNameFormatted()}</Text>
                  </View>
                )}
                <View style={[styles.summaryRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                  <Text style={styles.summaryLabel}>{t('medicalCauseSectionTitle')}:</Text>
                  <Text style={[styles.summaryVal, { textAlign: 'left', color: '#334155', fontWeight: '500' }]}>
                    {medicalCauseNote}
                  </Text>
                </View>
              </View>

              {/* Card 4: Uploaded Documents Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summarySectionTitle}>
                  <Ionicons name="document-attach" size={16} color="#0A5C53" /> {t('uploadedDocsTitle')} ({uploadedDocsCount})
                </Text>
                {aadhaarDoc && renderSummaryDocRow(t('aadhaarCard'), aadhaarDoc)}
                {incomeDoc && renderSummaryDocRow(t('incomeCertificate'), incomeDoc)}
                {medicalDocs.map((doc, i) =>
                  renderSummaryDocRow(`${t('medicalReport')} #${i + 1}`, doc)
                )}
                {rationCardDoc && renderSummaryDocRow(t('rationCard'), rationCardDoc)}
                {abhaDoc && renderSummaryDocRow(t('abhaCardDoc'), abhaDoc)}
                {pmjayDoc && renderSummaryDocRow(t('pmjayCardDoc'), pmjayDoc)}
                {otherDoc && renderSummaryDocRow(t('otherDocs'), otherDoc)}
                {referralDoc && renderSummaryDocRow(t('referralFormDoc'), referralDoc)}
              </View>

            </View>
          )}
        </ScrollView>

        {/* Bottom Fixed Action Button */}
        <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
          {currentStep < 4 ? (
            <TouchableOpacity
              style={[
                styles.proceedBtn,
                ((currentStep === 1 && !isStep1Valid) ||
                  (currentStep === 2 && !isStep2Valid) ||
                  (currentStep === 3 && !isStep3Valid))
                  ? styles.proceedBtnDisabled
                  : styles.proceedBtnActive,
              ]}
              disabled={
                (currentStep === 1 && !isStep1Valid) ||
                (currentStep === 2 && !isStep2Valid) ||
                (currentStep === 3 && !isStep3Valid)
              }
              onPress={handleProceed}
              activeOpacity={0.88}
            >
              {currentStep === 3 && isAnyDocUploading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.proceedBtnText}>Uploading to S3... / कृपया प्रतीक्षा करा...</Text>
                </View>
              ) : (
                <Text style={styles.proceedBtnText}>{t('proceed')}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.proceedBtn,
                styles.proceedBtnActive,
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              activeOpacity={0.88}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.proceedBtnText}>Submitting Application...</Text>
                </View>
              ) : (
                <Text style={styles.proceedBtnText}>{t('submitApplication')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ═════════════════ SUBMISSION LOADING OVERLAY ═════════════════ */}
      <Modal visible={isSubmitting} transparent animationType="fade">
        <View style={styles.centeredModalBackdrop}>
          <View style={styles.loadingOverlayCard}>
            <ActivityIndicator size="large" color="#0A5C53" style={{ marginBottom: 14 }} />
            <Text style={styles.loadingOverlayTitle}>Submitting Application</Text>
            <Text style={styles.loadingOverlaySub}>
              Uploading document attachments & registering case with ArogyaMitra...
            </Text>
            <Text style={styles.loadingOverlayHint}>Please wait, do not close the app.</Text>
          </View>
        </View>
      </Modal>

      {/* ═════════════════ MODAL 1: Upload Source Picker (Photo vs Files) ═════════════════ */}
      <Modal
        visible={uploadPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setUploadPickerVisible(false)}
          />
          <View style={[styles.sourcePickerCard, { paddingBottom: bottomInset + 10 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>{t('chooseDocSource')}</Text>
              <TouchableOpacity
                onPress={() => setUploadPickerVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.sourceOptionsCol}>
              <TouchableOpacity
                style={styles.sourceOptionBtn}
                activeOpacity={0.85}
                onPress={() => handleSelectSource('camera')}
              >
                <View style={styles.sourceIconBoxTeal}>
                  <Ionicons name="camera" size={24} color="#0A5C53" />
                </View>
                <View style={styles.sourceTextCol}>
                  <Text style={styles.sourceOptionTitle}>{t('clickPhoto')}</Text>
                  <Text style={styles.sourceOptionSub}>{t('clickPhotoSub')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sourceOptionBtn}
                activeOpacity={0.85}
                onPress={() => handleSelectSource('device')}
              >
                <View style={styles.sourceIconBoxTeal}>
                  <Ionicons name="folder-open" size={24} color="#0A5C53" />
                </View>
                <View style={styles.sourceTextCol}>
                  <Text style={styles.sourceOptionTitle}>{t('uploadFromDevice')}</Text>
                  <Text style={styles.sourceOptionSub}>{t('uploadFromDeviceSub')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelModalBtn}
              activeOpacity={0.8}
              onPress={() => setUploadPickerVisible(false)}
            >
              <Text style={styles.cancelModalBtnText}>{t('cancelBtn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <View style={styles.previewTitleBox}>
                <Text style={styles.modalTitleText}>{previewDoc?.name}</Text>
                <Text style={styles.previewDocNameSub}>{previewDoc?.size}</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <View style={styles.documentPreviewCanvas}>
                <View style={styles.previewDocHeader}>
                  <View style={styles.previewDocEmblem}>
                    <Ionicons name="shield-checkmark" size={22} color="#0A5C53" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewDocHeaderTitle}>HEALTH DOCUMENT ATTACHMENT</Text>
                    <Text style={styles.previewDocHeaderSub}>ArogyaMitra Scheme Application System</Text>
                  </View>
                </View>

                <View style={styles.previewDocBody}>
                  {(() => {
                    const name = (previewDoc?.name || '').toLowerCase();
                    const type = (previewDoc?.type || '').toLowerCase();
                    const uri = (previewDoc?.uri || '').toLowerCase();
                    const isImage = (uri.startsWith('data:image/') || type.startsWith('image/')) &&
                      !name.endsWith('.pdf') && !name.endsWith('.rtf') && !name.endsWith('.doc') && !name.endsWith('.docx');

                    if (isImage && previewDoc?.uri) {
                      return (
                        <View style={styles.previewImageWrapper}>
                          <Image
                            source={{ uri: previewDoc.uri }}
                            style={styles.previewImageThumb}
                            resizeMode="contain"
                          />
                        </View>
                      );
                    }

                    const isPdf = name.endsWith('.pdf') || type.includes('pdf');
                    const docUrl = (previewDoc?.file_url && (previewDoc.file_url.startsWith('http://') || previewDoc.file_url.startsWith('https://')))
                      ? previewDoc.file_url
                      : (previewDoc?.uri && (previewDoc.uri.startsWith('http://') || previewDoc.uri.startsWith('https://')))
                        ? previewDoc.uri
                        : '';
                    const pdfPagePreviewUrl = docUrl && docUrl.toLowerCase().endsWith('.pdf')
                      ? docUrl.replace(/\.pdf$/i, '.jpg')
                      : '';

                    if (isPdf) {
                      return (
                        <View style={styles.pdfFullPreviewWrapper}>
                          {pdfPagePreviewUrl ? (
                            <View style={styles.pdfPageImageContainer}>
                              <View style={styles.pdfPageImageHeader}>
                                <Ionicons name="document-text" size={16} color="#0A5C53" />
                                <Text style={styles.pdfPageImageHeaderText}>PDF Page 1 Preview / दस्तऐवज पान १</Text>
                              </View>
                              <Image
                                source={{ uri: pdfPagePreviewUrl }}
                                style={styles.pdfPageImagePreview}
                                resizeMode="contain"
                              />
                            </View>
                          ) : (
                            <View style={styles.pdfPreviewBox}>
                              <View style={styles.pdfIconBadgeRow}>
                                <View style={styles.pdfRedIconBox}>
                                  <Ionicons name="document-text" size={32} color="#DC2626" />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.pdfDocTitle} numberOfLines={2}>
                                    {previewDoc?.name}
                                  </Text>
                                  <Text style={styles.pdfDocTypeTag}>
                                    PDF DOCUMENT • {previewDoc?.size || 'DOC'}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.pdfStatusSuccessBanner}>
                                <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                                <Text style={styles.pdfStatusSuccessText}>
                                  PDF Document Attached & Verified
                                </Text>
                              </View>
                            </View>
                          )}

                          <TouchableOpacity
                            style={styles.openPdfActionBtn}
                            activeOpacity={0.85}
                            onPress={() => {
                              const target = docUrl || previewDoc?.uri;
                              if (target) {
                                Linking.openURL(target).catch(() => {
                                  Alert.alert('Notice', 'Unable to open PDF viewer on device.');
                                });
                              }
                            }}
                          >
                            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.openPdfActionBtnText}>
                              Open Full PDF / संपूर्ण PDF उघडा
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    return (
                      <View style={styles.pdfPreviewBox}>
                        <View style={[
                          styles.pdfIconBadgeRow,
                          { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }
                        ]}>
                          <View style={[
                            styles.pdfRedIconBox,
                            { backgroundColor: '#E0F2FE' }
                          ]}>
                            <Ionicons
                              name="document-attach"
                              size={32}
                              color="#0284C7"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[
                              styles.pdfDocTitle,
                              { color: '#0369A1' }
                            ]} numberOfLines={2}>
                              {previewDoc?.name}
                            </Text>
                            <Text style={[
                              styles.pdfDocTypeTag,
                              { color: '#0284C7' }
                            ]}>
                              ATTACHED FILE • {previewDoc?.size || 'DOC'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                  <Text style={styles.previewDocCenterName}>{previewDoc?.name}</Text>
                  <Text style={styles.previewDocDetailLine}>
                    रुग्ण: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{patientName || user?.name || 'नागरिक'}</Text>
                  </Text>
                  <Text style={styles.previewDocDetailLine}>
                    माध्यम: {previewDoc?.source === 'camera' ? 'कॅमेरा थेट फोटो' : 'डिव्हाइस स्टोरेज'}
                  </Text>
                  <Text style={styles.previewDocDetailLine}>
                    अपलोड वेळ: {previewDoc?.timestamp}
                  </Text>

                  {(() => {
                    const previewDocUrl = (previewDoc?.file_url && (previewDoc.file_url.startsWith('http://') || previewDoc.file_url.startsWith('https://')))
                      ? previewDoc.file_url
                      : (previewDoc?.uri && (previewDoc.uri.startsWith('http://') || previewDoc.uri.startsWith('https://')))
                        ? previewDoc.uri
                        : '';
                    if (!previewDocUrl) return null;
                    return (
                      <View style={styles.previewS3Box}>
                        <View style={styles.previewS3Header}>
                          <Ionicons name="cloud-done" size={16} color="#059669" />
                          <Text style={styles.previewS3Title}>Document Live S3 URL</Text>
                        </View>
                        <Text style={styles.previewS3Url} selectable numberOfLines={3}>
                          {previewDocUrl}
                        </Text>
                        <TouchableOpacity
                          style={styles.previewS3OpenBtn}
                          activeOpacity={0.8}
                          onPress={() => Linking.openURL(previewDocUrl)}
                        >
                          <Ionicons name="open-outline" size={14} color="#FFFFFF" />
                          <Text style={styles.previewS3OpenBtnText}>Open Document Link in Browser</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  <View style={styles.previewWatermark}>
                    <Text style={styles.previewWatermarkText}>✓ AROGYA MITRA VERIFIED</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closePreviewBtn}
              activeOpacity={0.88}
              onPress={() => setPreviewDoc(null)}
            >
              <Text style={styles.closePreviewBtnText}>{t('closePreview')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* RELATIONSHIP SELECTION MODAL */}
      <Modal
        visible={relationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRelationModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRelationModalVisible(false)}
        >
          <View style={styles.relationModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.relationModalHeader}>
              <Text style={styles.relationModalTitle}>{t('relationWithPatient')}</Text>
              <TouchableOpacity onPress={() => setRelationModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {RELATION_OPTIONS.map((item) => {
                const isSelected = selectedRelationKey === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.relationItem, isSelected && styles.relationItemActive]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectRelationOption(item)}
                  >
                    <Text style={[styles.relationItemText, isSelected && styles.relationItemTextActive]}>
                      {t(item.labelKey)}
                    </Text>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSelected ? '#0A5C53' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* RECOMMENDER TYPE SELECTION MODAL */}
      <Modal
        visible={recommenderTypeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRecommenderTypeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRecommenderTypeModalVisible(false)}
        >
          <View style={styles.relationModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.relationModalHeader}>
              <Text style={styles.relationModalTitle}>{t('recommenderTypeModalTitle')}</Text>
              <TouchableOpacity onPress={() => setRecommenderTypeModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {selectedRecommenderType ? (
                <TouchableOpacity
                  style={[
                    styles.relationItem,
                    { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', marginBottom: 10 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedRecommenderType('');
                    setCustomRecommenderType('');
                    setRecommenderTypeModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="close-circle" size={18} color="#DC2626" style={{ marginRight: 12 }} />
                    <Text style={[styles.relationItemText, { color: '#DC2626', fontWeight: '600' }]}>
                      {t('clearRecommenderSelection')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              {RECOMMENDER_TYPE_OPTIONS.map((item) => {
                const isSelected = selectedRecommenderType === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.relationItem, isSelected && styles.relationItemActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedRecommenderType('');
                        setCustomRecommenderType('');
                      } else {
                        setSelectedRecommenderType(item.key);
                        if (item.key !== 'other') {
                          setCustomRecommenderType('');
                        }
                      }
                      setRecommenderTypeModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={isSelected ? '#0A5C53' : '#64748B'}
                        style={{ marginRight: 12 }}
                      />
                      <Text style={[styles.relationItemText, isSelected && styles.relationItemTextActive, { flex: 1 }]}>
                        {t(item.labelKey)}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSelected ? '#0A5C53' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═════════════════ MODAL: Restore Draft Prompt ═════════════════ */}
      <Modal
        visible={draftPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDiscardDraft}
      >
        <View style={styles.centeredModalBackdrop}>
          <View style={styles.draftModalCard}>
            <View style={styles.draftIconHeader}>
              <Ionicons name="document-text" size={32} color="#0A5C53" />
            </View>

            <Text style={styles.draftModalTitle}>
              {t('draftFoundTitle') || 'Unsaved Draft Found'}
            </Text>
            <Text style={styles.draftModalSubtitle}>
              {t('draftFoundSubtitle') || 'An incomplete application was found. Would you like to resume it or start a new application?'}
            </Text>

            {savedDraftData && (
              <View style={styles.draftInfoBox}>
                <Text style={styles.draftInfoText}>
                  • {t('draftPatientLabel') || 'Patient'}: <Text style={{ fontWeight: '700' }}>{savedDraftData.patientName || (t('draftNotSpecified') || 'Not specified')}</Text>
                </Text>
                <Text style={styles.draftInfoText}>
                  • {t('draftProgressLabel') || 'Progress'}: {t('draftStepOfText') || 'Step'} {savedDraftData.currentStep || 1} {t('draftOfTotalText') || 'of'} 4
                </Text>
                {savedDraftData.savedAt && (
                  <Text style={styles.draftInfoText}>
                    • {t('draftSavedAtLabel') || 'Saved At'}: {new Date(savedDraftData.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.draftActionsCol}>
              <TouchableOpacity
                style={styles.restoreDraftBtn}
                activeOpacity={0.88}
                onPress={handleRestoreDraft}
              >
                <Ionicons name="refresh-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.restoreDraftBtnText}>
                  {t('draftRestoreActionBtn') || 'Restore Saved Draft'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.discardDraftBtn}
                activeOpacity={0.85}
                onPress={handleDiscardDraft}
              >
                <Ionicons name="add-circle-outline" size={18} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.discardDraftBtnText}>
                  {t('draftStartNewActionBtn') || 'Start New Application'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═════════════════ MODAL: Searchable District Selection ═════════════════ */}
      <SearchableSelectModal
        visible={districtModalVisible}
        title={`${t('district')} (Maharashtra)`}
        placeholder="Type district name (e.g. Pune, Palghar)..."
        items={locationDirectoryService.getStructuredDistricts(language)}
        selectedValue={district}
        onSelect={handleSelectDistrict}
        onClose={() => setDistrictModalVisible(false)}
        prefixMatch={true}
      />

      {/* ═════════════════ MODAL: Searchable Taluka Selection ═════════════════ */}
      <SearchableSelectModal
        visible={talukaModalVisible}
        title={`${t('taluka')} (${district ? locationDirectoryService.resolveDistrictDisplay(district, language) : ''})`}
        placeholder="Type taluka name..."
        items={district ? locationDirectoryService.getStructuredTalukas(district, language) : []}
        selectedValue={taluka}
        onSelect={handleSelectTaluka}
        onClose={() => setTalukaModalVisible(false)}
        prefixMatch={true}
      />

      {/* ═════════════════ MODAL: Date of Birth Picker ═════════════════ */}
      <DatePickerModal
        visible={dobPickerVisible}
        value={patientDob}
        onConfirm={handleConfirmDob}
        onClose={() => setDobPickerVisible(false)}
        title={t('dobLabel')}
      />

      {/* ═════════════════ MODAL: Language Confirmation (Disabled / Commented Out) ═════════════════ */}
      {/*
      <LanguageConfirmationModal
        visible={languageConfirmationState.visible}
        appLanguage={language}
        detectedLanguage={languageConfirmationState.detectedLanguage}
        sampleText={languageConfirmationState.sampleText}
        isMixed={languageConfirmationState.isMixed}
        onContinue={handleModalContinue}
        onSwitchAppLanguage={handleModalSwitchLanguage}
        onClose={handleModalClose}
      />
      */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  backButtonBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0A5C53',
    letterSpacing: -0.3,
  },
  progressSegmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  progressSegmentFilled: {
    backgroundColor: '#0A5C53',
  },
  stepSubtitleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  bodyContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 160,
    flexGrow: 1,
  },
  stepContainer: {
    flexDirection: 'column',
    width: '100%',
    paddingBottom: 24,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  schemeOptionsList: {
    flexDirection: 'column',
    width: '100%',
  },
  schemeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2ECE9',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  schemeCardDashed: {
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#FCFDFD',
  },
  schemeCardSelected: {
    borderColor: '#0A5C53',
    backgroundColor: '#FAFDFD',
  },
  schemeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  schemeTextCol: {
    flex: 1,
  },
  schemeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  schemeTitleSelected: {
    color: '#0A5C53',
  },
  schemeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#0A5C53',
  },
  radioInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0A5C53',
  },
  abhaCardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2ECE9',
    padding: 16,
    marginTop: 6,
    flexDirection: 'column',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  abhaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  abhaIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  abhaCardHelpText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  inputGroup: {
    flexDirection: 'column',
    width: '100%',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  mandatoryAsterisk: {
    color: '#EF4444',
  },
  optionalLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 15,
    color: '#1E293B',
    width: '100%',
  },
  textInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
  textArea: {
    minHeight: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  largeNoteArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
    borderColor: '#CBD5E1',
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  segmentBtnActive: {
    borderColor: '#0A5C53',
    backgroundColor: '#E8F4F2',
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  segmentBtnTextActive: {
    color: '#0A5C53',
  },
  infoNoticeCard: {
    backgroundColor: '#E8F4F2',
    borderWidth: 1,
    borderColor: '#BBE3DC',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    width: '100%',
  },
  infoNoticeText: {
    fontSize: 13,
    color: '#0A5C53',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginTop: 4,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  formSectionBox: {
    flexDirection: 'column',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2ECE9',
    padding: 16,
    marginBottom: 16,
  },
  formSectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A5C53',
    marginBottom: 12,
  },
  causeNoticeBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  causeNoticeText: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  docNoticeBanner: {
    backgroundColor: '#E8F4F2',
    borderWidth: 1,
    borderColor: '#BBE3DC',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  docNoticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A5C53',
    flex: 1,
    lineHeight: 18,
  },
  docSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2ECE9',
    padding: 14,
    marginBottom: 14,
    width: '100%',
    overflow: 'hidden',
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  docLabelCol: {
    flex: 1,
    minWidth: '55%',
    flexShrink: 1,
    paddingRight: 8,
  },
  docNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 20,
  },
  docOptionalText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  uploadActionBtn: {
    backgroundColor: '#0A5C53',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 95,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  uploadActionBtnUploaded: {
    backgroundColor: '#E8F4F2',
    borderWidth: 1,
    borderColor: '#C6DDD8',
  },
  uploadActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadActionBtnTextUploaded: {
    color: '#0A5C53',
  },
  docCountBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A5C53',
  },
  compactDocCardWrapper: {
    width: '100%',
    marginTop: 10,
  },
  compactDocCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E8E4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  compactDocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  compactDocIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  compactDocIconBoxUploaded: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  compactDocTextCol: {
    flex: 1,
    flexShrink: 1,
  },
  compactDocName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  compactDocMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  compactDocActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  compactActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  compactActionDeleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  s3LinkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    width: '100%',
  },
  s3LinkBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  s3LinkBarTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 5,
    marginRight: 4,
  },
  s3LinkBarUrl: {
    fontSize: 11,
    color: '#166534',
    flex: 1,
    textDecorationLine: 'underline',
  },
  s3OpenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  s3OpenPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 3,
  },
  s3PendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  s3PendingBarText: {
    fontSize: 11,
    color: '#B45309',
    marginLeft: 6,
    flex: 1,
  },
  addMoreDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7F5',
    borderWidth: 1,
    borderColor: '#C2DFD9',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  addMoreDocsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A5C53',
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2ECE9',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'column',
    width: '100%',
    marginBottom: 16,
  },
  summarySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A5C53',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  summaryVal: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'right',
    flex: 1.5,
  },
  summarySchemeVal: {
    color: '#0A5C53',
    fontWeight: '800',
  },
  summaryDocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryDocItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  summaryDocCardItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
  },
  summaryDocItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDocLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  summaryDocLinkUrl: {
    fontSize: 11,
    color: '#15803D',
    flex: 1,
    marginHorizontal: 6,
    textDecorationLine: 'underline',
  },
  summaryOpenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  summaryOpenTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    marginRight: 2,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  proceedBtn: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  proceedBtnDisabled: {
    backgroundColor: '#95B7B0',
  },
  proceedBtnActive: {
    backgroundColor: '#0A5C53',
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  proceedBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successScreenWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  successTopContent: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0A5C53',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  successHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  successSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  caseIdCard: {
    width: '100%',
    backgroundColor: '#F1F7F6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7E9E5',
    marginBottom: 14,
  },
  caseIdLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  caseIdValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0A5C53',
    letterSpacing: 1,
  },
  caseIdSafeNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  backToHomePrimaryBtn: {
    backgroundColor: '#0A5C53',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  backToHomePrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sourcePickerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sourceOptionsCol: {
    marginBottom: 18,
  },
  sourceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sourceIconBoxTeal: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sourceTextCol: {
    flex: 1,
  },
  sourceOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sourceOptionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cancelModalBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  previewModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  previewTitleBox: {
    flex: 1,
    marginRight: 12,
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
    padding: 16,
    marginVertical: 16,
  },
  previewDocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE9',
    marginBottom: 16,
  },
  previewDocEmblem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewDocHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A5C53',
  },
  previewDocHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  previewDocBody: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  previewDocCenterName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  previewDocDetailLine: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  previewWatermark: {
    marginTop: 14,
    backgroundColor: '#E8F4F2',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A8D3CA',
  },
  previewWatermarkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A5C53',
    letterSpacing: 0.5,
  },
  closePreviewBtn: {
    backgroundColor: '#0A5C53',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePreviewBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  previewImageWrapper: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImageThumb: {
    width: '100%',
    height: '100%',
  },
  labelContainer: {
    minHeight: 22,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  dobInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 10,
    width: '100%',
  },
  calendarIconBtn: {
    padding: 4,
    marginRight: 6,
  },
  dobTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 0,
    height: '100%',
  },
  pickDateBtn: {
    backgroundColor: '#E8F4F2',
    borderWidth: 1,
    borderColor: '#B0DDD6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 6,
  },
  pickDateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
  },
  autoCalcBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A5C53',
  },
  autoGenderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F2',
    borderWidth: 1,
    borderColor: '#B0DDD6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  autoGenderBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A5C53',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  treatmentCardsContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: 4,
  },
  treatmentCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  treatmentCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0A5C53',
  },
  treatmentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  treatmentIconBoxActive: {
    backgroundColor: '#E8F4F2',
  },
  treatmentCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 0,
  },
  treatmentCardTitleActive: {
    color: '#0A5C53',
  },
  relationModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  relationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  relationModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  relationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  relationItemActive: {
    backgroundColor: '#E8F4F2',
    borderColor: '#0A5C53',
  },
  relationItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  relationItemTextActive: {
    fontWeight: '800',
    color: '#0A5C53',
  },
  centeredModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  draftModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  draftIconHeader: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  draftModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  draftModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  draftInfoBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 20,
    gap: 4,
  },
  draftInfoText: {
    fontSize: 12,
    color: '#334155',
  },
  draftActionsCol: {
    width: '100%',
    gap: 10,
  },
  restoreDraftBtn: {
    backgroundColor: '#0A5C53',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  restoreDraftBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  discardDraftBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  discardDraftBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  step1HeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  refreshSchemesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#C6DDD8',
  },
  refreshSchemesBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
  },
  pdfPreviewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    width: '100%',
  },
  pdfIconBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
  },
  pdfRedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfDocTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  pdfDocTypeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
    marginTop: 2,
  },
  pdfStatusSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    width: '100%',
  },
  pdfStatusSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  compactDocThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  pdfFullPreviewWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  pdfPageImageContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 10,
  },
  pdfPageImageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#C6DDD8',
  },
  pdfPageImageHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
  },
  pdfPageImagePreview: {
    width: '100%',
    height: 230,
    backgroundColor: '#FFFFFF',
  },
  openPdfActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A5C53',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '100%',
    gap: 8,
    marginVertical: 4,
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  openPdfActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingOverlayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingOverlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingOverlaySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  loadingOverlayHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A5C53',
  },
  previewS3Box: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
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
    marginBottom: 10,
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
});
