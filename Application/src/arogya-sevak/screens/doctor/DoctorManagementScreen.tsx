import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../shared/theme/colors';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { specializationService } from '../../../shared/services/specializationService';
import {
  HospitalDoctor,
  DoctorType,
  DoctorShift,
  DoctorAvailabilityStatus,
  DoctorStats,
} from '../../types/sevakDoctor.types';
import { sevakDoctorService } from '../../services/sevakDoctorService';
import { sevakHospitalService } from '../../services/sevakHospitalService';

const STANDARD_SPECIALIZATIONS = specializationService.getStandardSpecializations();

const SHIFT_OPTIONS: { shift: DoctorShift; label: string; defaultTiming: string }[] = [
  { shift: 'Morning', label: 'Morning', defaultTiming: 'Morning 8:00 AM - 12:00 PM' },
  { shift: 'Afternoon', label: 'Afternoon', defaultTiming: 'Afternoon 1:00 PM - 4:00 PM' },
  { shift: 'Evening', label: 'Evening', defaultTiming: 'Evening 4:00 PM - 6:00 PM' },
  { shift: 'Evening', label: 'Late Evening', defaultTiming: 'Evening 6:00 PM - 9:00 PM' },
  { shift: 'Full Day', label: 'Full Day', defaultTiming: '9:00 AM - 5:00 PM' },
  { shift: 'Custom', label: 'Custom', defaultTiming: '' },
];

const AVAILABILITY_CONFIG: Record<
  DoctorAvailabilityStatus,
  { label: string; bg: string; text: string; icon: string; border: string }
> = {
  Available: {
    label: 'Available',
    bg: '#DCFCE7',
    text: '#16A34A',
    icon: 'checkmark-circle',
    border: '#86EFAC',
  },
  'On Leave': {
    label: 'On Leave',
    bg: '#FEF3C7',
    text: '#D97706',
    icon: 'calendar-outline',
    border: '#FDE68A',
  },
  'In Surgery': {
    label: 'In Surgery',
    bg: '#F3E8FF',
    text: '#9333EA',
    icon: 'pulse-outline',
    border: '#D8B4FE',
  },
  'Emergency Duty': {
    label: 'Emergency Duty',
    bg: '#FEE2E2',
    text: '#DC2626',
    icon: 'alert-circle',
    border: '#FCA5A5',
  },
  Unavailable: {
    label: 'Unavailable',
    bg: '#F1F5F9',
    text: '#64748B',
    icon: 'close-circle-outline',
    border: '#CBD5E1',
  },
};

type FilterTab = 'All' | 'Available' | 'OPD' | 'IPD' | 'On Leave' | 'Deactivated';

export const DoctorManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [stats, setStats] = useState<DoctorStats | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [togglingDoctorId, setTogglingDoctorId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('');
  const [formDoctorType, setFormDoctorType] = useState<DoctorType>('OPD');
  const [formOpdShift, setFormOpdShift] = useState<DoctorShift>('Morning');
  const [formOpdTiming, setFormOpdTiming] = useState('Morning 8:00 AM - 12:00 PM');
  const [formAvailability, setFormAvailability] = useState<DoctorAvailabilityStatus>('Available');
  const [formPhone, setFormPhone] = useState('');
  const [formVillageCity, setFormVillageCity] = useState('');
  const [formTaluka, setFormTaluka] = useState('Haveli');
  const [formDistrict, setFormDistrict] = useState('Pune');
  const [formPincode, setFormPincode] = useState('');

  // Required Fields Validator to Enable/Disable Submit Button
  const isFormValid = useMemo(() => {
    const cleanPhone = formPhone.replace(/\D/g, '');
    const isNameValid = formName.trim().length > 0;
    const isSpecValid = formSpecialization.trim().length > 0;
    const isPhoneValid = cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone);
    const isAddressValid =
      formVillageCity.trim().length > 0 &&
      formTaluka.trim().length > 0 &&
      formDistrict.trim().length > 0;

    return Boolean(isNameValid && isSpecValid && isPhoneValid && isAddressValid);
  }, [formName, formSpecialization, formPhone, formVillageCity, formTaluka, formDistrict]);

  const loadDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const [list, s] = await Promise.all([
        sevakDoctorService.getDoctors(undefined, true),
        sevakDoctorService.getDoctorStats(),
      ]);
      setDoctors(list);
      setStats(s);
    } catch (e) {
      console.warn('Failed to load doctors', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDoctors();
  };

  // Open modal for new doctor
  const handleOpenAddModal = () => {
    setEditingDoctorId(null);
    setFormName('');
    setFormQualification('');
    setFormSpecialization(STANDARD_SPECIALIZATIONS[0]);
    setFormDoctorType('OPD');
    setFormOpdShift('Morning');
    setFormOpdTiming('Morning 8:00 AM - 12:00 PM');
    setFormAvailability('Available');
    setFormPhone('');
    setFormVillageCity('');
    setFormTaluka('Haveli');
    setFormDistrict('Pune');
    setFormPincode('');
    setModalVisible(true);
  };

  // Open modal for editing doctor
  const handleOpenEditModal = (doctor: HospitalDoctor) => {
    setEditingDoctorId(doctor.id);
    setFormName(doctor.name);
    setFormQualification(doctor.qualification);
    setFormSpecialization(doctor.specialization);
    setFormDoctorType(doctor.doctorType);
    setFormOpdShift(doctor.opdShift || 'Morning');
    setFormOpdTiming(doctor.opdTiming || '');
    setFormAvailability(doctor.availabilityStatus);

    // Extract clean 10-digit number without country code
    const rawDigits = (doctor.contactPhone || '').replace(/\D/g, '');
    const clean10 =
      rawDigits.startsWith('91') && rawDigits.length === 12
        ? rawDigits.slice(2)
        : rawDigits.length > 10
        ? rawDigits.slice(-10)
        : rawDigits;
    setFormPhone(clean10);

    setFormVillageCity(doctor.personalAddress.villageCity);
    setFormTaluka(doctor.personalAddress.taluka);
    setFormDistrict(doctor.personalAddress.district);
    setFormPincode(doctor.personalAddress.pincode || '');
    setModalVisible(true);
  };

  // Save Doctor (Add or Edit)
  const handleSaveDoctor = async () => {
    if (!isFormValid || savingDoctor) return;

    const cleanPhone = formPhone.replace(/\D/g, '');

    if (!formName.trim()) {
      Alert.alert(t('doctorNameLabel') || 'Name Required', 'Please enter the doctor full name.');
      return;
    }
    if (!formSpecialization.trim()) {
      Alert.alert(t('doctorSpecializationLabel') || 'Specialization Required', 'Please enter or select a specialization.');
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      Alert.alert(
        'Invalid Mobile Number',
        'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      );
      return;
    }
    if (!formVillageCity.trim() || !formTaluka.trim() || !formDistrict.trim()) {
      Alert.alert('Address Required', 'Please enter village/city, taluka, and district.');
      return;
    }

    try {
      setSavingDoctor(true);
      let hospId: string | undefined = undefined;
      try {
        const hosp = await sevakHospitalService.getHospitalProfile();
        if (hosp?.id || hosp?.assignedHospitalId) {
          hospId = hosp.id || hosp.assignedHospitalId;
        }
      } catch {}

      const formattedPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;

      const doctorPayload = {
        hospitalId: hospId || 'HOSP-PUN-042',
        name: formName.trim(),
        qualification: formQualification.trim() || 'MBBS',
        specialization: formSpecialization.trim(),
        doctorType: formDoctorType,
        opdShift: formDoctorType !== 'IPD' ? formOpdShift : undefined,
        opdTiming: formDoctorType !== 'IPD' ? formOpdTiming.trim() : undefined,
        availabilityStatus: formAvailability,
        contactPhone: formattedPhone,
        personalAddress: {
          villageCity: formVillageCity.trim(),
          taluka: formTaluka.trim(),
          district: formDistrict.trim(),
          pincode: formPincode.trim() || undefined,
        },
        isActive: true,
      };

      if (editingDoctorId) {
        await sevakDoctorService.updateDoctor(editingDoctorId, doctorPayload);
        Alert.alert('Success', 'Doctor details updated successfully!');
      } else {
        await sevakDoctorService.addDoctor(doctorPayload);
        Alert.alert('Success', 'Doctor registered and added to roster successfully!');
      }

      setModalVisible(false);
      await loadDoctors();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save doctor details');
    } finally {
      setSavingDoctor(false);
    }
  };

  // Quick Availability Status update directly from the card
  const handleQuickAvailabilityChange = async (
    doctorId: string,
    newStatus: DoctorAvailabilityStatus
  ) => {
    try {
      await sevakDoctorService.setDoctorAvailability(doctorId, newStatus);
      loadDoctors();
    } catch (e) {
      console.warn('Failed to update availability status', e);
    }
  };

  // Toggle Doctor Active / Deactivate status
  const handleToggleDeactivate = (doctor: HospitalDoctor) => {
    if (togglingDoctorId) return;

    if (doctor.isActive) {
      Alert.alert(
        t('deactivatePromptTitle') || 'Deactivate Doctor?',
        `${t('deactivatePromptMsg') || 'Is this doctor no longer practicing at this hospital?'}\n\nDoctor: ${doctor.name}`,
        [
          { text: t('cancel') || 'Cancel', style: 'cancel' },
          {
            text: t('btnDeactivateDoctor') || 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                setTogglingDoctorId(doctor.id);
                await sevakDoctorService.toggleDoctorActive(
                  doctor.id,
                  'Transferred or resigned from hospital'
                );
                Alert.alert(
                  'Doctor Deactivated',
                  `${doctor.name} has been marked as inactive/deactivated.`
                );
                await loadDoctors();
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to deactivate doctor');
              } finally {
                setTogglingDoctorId(null);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        t('activatePromptTitle') || 'Reactivate Doctor?',
        `${t('activatePromptMsg') || 'Do you want to restore this doctor to the active roster?'}\n\nDoctor: ${doctor.name}`,
        [
          { text: t('cancel') || 'Cancel', style: 'cancel' },
          {
            text: t('btnActivateDoctor') || 'Reactivate',
            style: 'default',
            onPress: async () => {
              try {
                setTogglingDoctorId(doctor.id);
                await sevakDoctorService.toggleDoctorActive(doctor.id);
                Alert.alert(
                  'Doctor Reactivated',
                  `${doctor.name} has been restored to the active duty roster.`
                );
                await loadDoctors();
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to reactivate doctor');
              } finally {
                setTogglingDoctorId(null);
              }
            },
          },
        ]
      );
    }
  };

  // Filter & Search Logic
  const filteredDoctors = useMemo(() => {
    let list = doctors;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.qualification.toLowerCase().includes(q) ||
          d.personalAddress.villageCity.toLowerCase().includes(q) ||
          d.personalAddress.district.toLowerCase().includes(q)
      );
    }

    // Active Filter Tabs
    switch (activeFilter) {
      case 'Available':
        return list.filter((d) => d.isActive && d.availabilityStatus === 'Available');
      case 'OPD':
        return list.filter(
          (d) => d.isActive && (d.doctorType === 'OPD' || d.doctorType === 'Both')
        );
      case 'IPD':
        return list.filter(
          (d) => d.isActive && (d.doctorType === 'IPD' || d.doctorType === 'Both')
        );
      case 'On Leave':
        return list.filter((d) => d.isActive && d.availabilityStatus === 'On Leave');
      case 'Deactivated':
        return list.filter((d) => !d.isActive);
      case 'All':
      default:
        return list;
    }
  }, [doctors, searchQuery, activeFilter]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('doctorManagementTitle')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {t('doctorManagementSub')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addDoctorHeaderBtn}
          onPress={handleOpenAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addDoctorHeaderBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Stats Banner */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.active}</Text>
              <Text style={styles.statLabel}>{t('totalDoctorsCount')}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.availableBadgeRow}>
                <View style={styles.greenPulsingDot} />
                <Text style={[styles.statNumber, { color: '#16A34A' }]}>{stats.availableNow}</Text>
              </View>
              <Text style={styles.statLabel}>{t('availableNowCount')}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#0284C7' }]}>{stats.opdCount}</Text>
              <Text style={styles.statLabel}>{t('opdDoctorsCount')}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#7C3AED' }]}>{stats.ipdCount}</Text>
              <Text style={styles.statLabel}>{t('ipdDoctorsCount')}</Text>
            </View>
          </View>
        )}

        {/* Search Input Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('doctorSearchPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs Horizontal Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {(['All', 'Available', 'OPD', 'IPD', 'On Leave', 'Deactivated'] as FilterTab[]).map(
            (tab) => {
              const selected = activeFilter === tab;
              const count =
                tab === 'All'
                  ? doctors.length
                  : tab === 'Available'
                  ? stats?.availableNow ?? 0
                  : tab === 'OPD'
                  ? stats?.opdCount ?? 0
                  : tab === 'IPD'
                  ? stats?.ipdCount ?? 0
                  : tab === 'On Leave'
                  ? stats?.onLeave ?? 0
                  : stats?.deactivated ?? 0;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => setActiveFilter(tab)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.filterChipText, selected && styles.filterChipTextActive]}
                  >
                    {tab === 'All'
                      ? t('filterAllDocs')
                      : tab === 'Available'
                      ? t('filterAvailableDocs')
                      : tab === 'OPD'
                      ? t('filterOpdDocs')
                      : tab === 'IPD'
                      ? t('filterIpdDocs')
                      : tab === 'On Leave'
                      ? t('filterOnLeaveDocs')
                      : t('filterDeactivatedDocs')}
                  </Text>
                  <View
                    style={[
                      styles.filterChipCount,
                      selected && styles.filterChipCountActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipCountText,
                        selected && styles.filterChipCountTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {/* Doctors Card List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.sevak.primary} />
          </View>
        ) : filteredDoctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="medkit-outline" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>{t('noDoctorsFound')}</Text>
            <Text style={styles.emptySubText}>
              Try changing your search query or filter criteria.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={handleOpenAddModal}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>{t('btnAddDoctor')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.doctorListContainer}>
            {filteredDoctors.map((doc) => {
              const avail = AVAILABILITY_CONFIG[doc.availabilityStatus] || AVAILABILITY_CONFIG.Available;

              return (
                <View
                  key={doc.id}
                  style={[styles.doctorCard, !doc.isActive && styles.doctorCardDeactivated]}
                >
                  {/* Top Doctor Info Row */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.docAvatarCircle}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={doc.isActive ? '#0284C7' : '#94A3B8'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.nameStatusRow}>
                        <Text
                          style={[
                            styles.doctorNameText,
                            !doc.isActive && styles.doctorNameTextDeactivated,
                          ]}
                          numberOfLines={1}
                        >
                          {doc.name}
                        </Text>

                        {/* Availability / Deactivated Badge */}
                        {doc.isActive ? (
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: avail.bg, borderColor: avail.border },
                            ]}
                          >
                            <Ionicons name={avail.icon as any} size={11} color={avail.text} />
                            <Text style={[styles.statusBadgeText, { color: avail.text }]}>
                              {avail.label}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.deactivatedBadge}>
                            <Ionicons name="alert-circle-outline" size={11} color="#DC2626" />
                            <Text style={styles.deactivatedBadgeText}>
                              {t('doctorDeactivatedStatus')}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.qualificationText} numberOfLines={1}>
                        {doc.qualification}
                      </Text>
                    </View>
                  </View>

                  {/* Badges Strip: Specialization, OPD/IPD Role, Shift */}
                  <View style={styles.tagsRow}>
                    {/* Specialization Pill */}
                    <View style={styles.specTag}>
                      <Ionicons name="ribbon-outline" size={12} color="#0369A1" />
                      <Text style={styles.specTagText}>
                        {specializationService.resolveDisplay(doc.specialization, language)}
                      </Text>
                    </View>

                    {/* Role Pill (OPD / IPD / Both) */}
                    <View
                      style={[
                        styles.roleTag,
                        doc.doctorType === 'OPD'
                          ? styles.roleTagOpd
                          : doc.doctorType === 'IPD'
                          ? styles.roleTagIpd
                          : styles.roleTagBoth,
                      ]}
                    >
                      <Ionicons
                        name={doc.doctorType === 'IPD' ? 'bed-outline' : 'people-outline'}
                        size={11}
                        color={
                          doc.doctorType === 'OPD'
                            ? '#0284C7'
                            : doc.doctorType === 'IPD'
                            ? '#7C3AED'
                            : '#059669'
                        }
                      />
                      <Text
                        style={[
                          styles.roleTagText,
                          doc.doctorType === 'OPD'
                            ? styles.roleTagTextOpd
                            : doc.doctorType === 'IPD'
                            ? styles.roleTagTextIpd
                            : styles.roleTagTextBoth,
                        ]}
                      >
                        {doc.doctorType === 'Both'
                          ? 'OPD & IPD'
                          : doc.doctorType}
                      </Text>
                    </View>

                    {/* OPD Shift Pill if applicable */}
                    {doc.opdShift && doc.doctorType !== 'IPD' && (
                      <View style={styles.shiftTag}>
                        <Ionicons
                          name={
                            doc.opdShift === 'Morning'
                              ? 'sunny-outline'
                              : doc.opdShift === 'Evening'
                              ? 'moon-outline'
                              : 'time-outline'
                          }
                          size={11}
                          color="#D97706"
                        />
                        <Text style={styles.shiftTagText}>{doc.opdShift}</Text>
                      </View>
                    )}
                  </View>

                  {/* Timing Strip if OPD */}
                  {doc.opdTiming && doc.doctorType !== 'IPD' && (
                    <View style={styles.timingBox}>
                      <Ionicons name="time" size={13} color="#0284C7" />
                      <Text style={styles.timingBoxText}>{doc.opdTiming}</Text>
                    </View>
                  )}

                  {/* Address & Contact Row */}
                  <View style={styles.addressContactRow}>
                    <View style={styles.addressCol}>
                      <Ionicons name="location-outline" size={13} color="#64748B" />
                      <Text style={styles.addressText} numberOfLines={1}>
                        {doc.personalAddress.villageCity}, {doc.personalAddress.taluka},{' '}
                        {doc.personalAddress.district}
                        {doc.personalAddress.pincode
                          ? ` - ${doc.personalAddress.pincode}`
                          : ''}
                      </Text>
                    </View>

                    {doc.contactPhone ? (
                      <TouchableOpacity
                        style={styles.phoneChip}
                        onPress={() => Linking.openURL(`tel:${doc.contactPhone}`)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={11} color="#0284C7" />
                        <Text style={styles.phoneChipText}>{doc.contactPhone}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Quick Availability Status Toggles directly on the Card */}
                  {doc.isActive && (
                    <View style={styles.quickStatusContainer}>
                      <Text style={styles.quickStatusLabel}>
                        {t('doctorAvailabilityLabel')}:
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickStatusRow}
                      >
                        {(
                          [
                            'Available',
                            'On Leave',
                            'In Surgery',
                            'Emergency Duty',
                            'Unavailable',
                          ] as DoctorAvailabilityStatus[]
                        ).map((statusKey) => {
                          const isCur = doc.availabilityStatus === statusKey;
                          const cfg = AVAILABILITY_CONFIG[statusKey];

                          return (
                            <TouchableOpacity
                              key={statusKey}
                              style={[
                                styles.quickStatusChip,
                                isCur && {
                                  backgroundColor: cfg.bg,
                                  borderColor: cfg.border,
                                },
                              ]}
                              onPress={() => handleQuickAvailabilityChange(doc.id, statusKey)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={cfg.icon as any}
                                size={12}
                                color={isCur ? cfg.text : '#94A3B8'}
                              />
                              <Text
                                style={[
                                  styles.quickStatusChipText,
                                  isCur && { color: cfg.text, fontWeight: '700' },
                                ]}
                              >
                                {statusKey}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Action Buttons: Edit & Deactivate */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenEditModal(doc)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="create-outline" size={14} color="#0284C7" />
                      <Text style={styles.editBtnText}>{t('btnEditDoctor')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.deactivateBtn,
                        !doc.isActive && styles.reactivateBtn,
                        togglingDoctorId === doc.id && { opacity: 0.6 },
                      ]}
                      onPress={() => handleToggleDeactivate(doc)}
                      disabled={togglingDoctorId === doc.id}
                      activeOpacity={0.75}
                    >
                      {togglingDoctorId === doc.id ? (
                        <ActivityIndicator
                          size="small"
                          color={doc.isActive ? '#DC2626' : '#16A34A'}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name={doc.isActive ? 'person-remove-outline' : 'person-add-outline'}
                            size={14}
                            color={doc.isActive ? '#DC2626' : '#16A34A'}
                          />
                          <Text
                            style={[
                              styles.deactivateBtnText,
                              !doc.isActive && styles.reactivateBtnText,
                            ]}
                          >
                            {doc.isActive ? t('btnDeactivateDoctor') || 'Deactivate' : t('btnActivateDoctor') || 'Reactivate'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Doctor Modal Form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!savingDoctor) {
            setModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxHeight: '100%' }}
          >
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleBlock}>
                  <Ionicons
                    name={editingDoctorId ? 'create' : 'person-add'}
                    size={20}
                    color="#0284C7"
                  />
                  <Text style={styles.modalTitleText}>
                    {editingDoctorId ? t('btnEditDoctor') || 'Edit Doctor' : t('btnAddDoctor') || '+ Add Doctor'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => !savingDoctor && setModalVisible(false)}
                  disabled={savingDoctor}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={savingDoctor ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 100 }}
              >
              {/* Doctor Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {t('doctorNameLabel')} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.inputField}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder={t('doctorNamePlaceholder')}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Qualification / Degrees */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('qualificationLabel')}</Text>
                <TextInput
                  style={styles.inputField}
                  value={formQualification}
                  onChangeText={setFormQualification}
                  placeholder={t('qualificationPlaceholder')}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Specialization Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {t('doctorSpecializationLabel')} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.inputField}
                  value={formSpecialization}
                  onChangeText={setFormSpecialization}
                  placeholder="Enter or choose specialization below..."
                  placeholderTextColor="#94A3B8"
                />

                {/* Quick Specialization Preset Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.specChipsRow}
                >
                  {STANDARD_SPECIALIZATIONS.map((spec) => (
                    <TouchableOpacity
                      key={spec}
                      style={[
                        styles.specChip,
                        formSpecialization === spec && styles.specChipActive,
                      ]}
                      onPress={() => setFormSpecialization(spec)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.specChipText,
                          formSpecialization === spec && styles.specChipTextActive,
                        ]}
                      >
                        {specializationService.resolveDisplay(spec, language)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Doctor Role (OPD / IPD / Both) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {t('doctorTypeLabel')} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.segmentedRow}>
                  {(['OPD', 'IPD', 'Both'] as DoctorType[]).map((type) => {
                    const sel = formDoctorType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.segmentBtn, sel && styles.segmentBtnActive]}
                        onPress={() => setFormDoctorType(type)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={
                            type === 'OPD'
                              ? 'people'
                              : type === 'IPD'
                              ? 'bed'
                              : 'git-merge'
                          }
                          size={14}
                          color={sel ? '#FFFFFF' : '#64748B'}
                        />
                        <Text
                          style={[styles.segmentBtnText, sel && styles.segmentBtnTextActive]}
                        >
                          {type === 'OPD'
                            ? t('doctorTypeOpd')
                            : type === 'IPD'
                            ? t('doctorTypeIpd')
                            : t('doctorTypeBoth')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* OPD Shift & Timing (Only if OPD or Both) */}
              {formDoctorType !== 'IPD' && (
                <View style={styles.subFormCard}>
                  <View style={styles.subFormHeader}>
                    <Ionicons name="time" size={15} color="#0284C7" />
                    <Text style={styles.subFormTitle}>OPD Duty Hours & Shift</Text>
                  </View>

                  {/* Preset Shift Capsules */}
                  <View style={styles.shiftPresetsRow}>
                    {SHIFT_OPTIONS.map((opt, i) => {
                      const sel = formOpdTiming === opt.defaultTiming;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[styles.shiftPresetChip, sel && styles.shiftPresetChipActive]}
                          onPress={() => {
                            setFormOpdShift(opt.shift);
                            if (opt.defaultTiming) {
                              setFormOpdTiming(opt.defaultTiming);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.shiftPresetChipText,
                              sel && styles.shiftPresetChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* OPD Timing input box */}
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.innerLabel}>{t('opdTimingLabel')}</Text>
                    <TextInput
                      style={styles.inputField}
                      value={formOpdTiming}
                      onChangeText={setFormOpdTiming}
                      placeholder={t('opdTimingPlaceholder')}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              )}

              {/* Availability Status */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {t('doctorAvailabilityLabel')} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.availabilityGrid}>
                  {(
                    [
                      'Available',
                      'On Leave',
                      'In Surgery',
                      'Emergency Duty',
                      'Unavailable',
                    ] as DoctorAvailabilityStatus[]
                  ).map((statusKey) => {
                    const sel = formAvailability === statusKey;
                    const cfg = AVAILABILITY_CONFIG[statusKey];

                    return (
                      <TouchableOpacity
                        key={statusKey}
                        style={[
                          styles.availSelectChip,
                          sel && {
                            backgroundColor: cfg.bg,
                            borderColor: cfg.border,
                            borderWidth: 1.5,
                          },
                        ]}
                        onPress={() => setFormAvailability(statusKey)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={cfg.icon as any}
                          size={14}
                          color={sel ? cfg.text : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.availSelectChipText,
                            sel && { color: cfg.text, fontWeight: '700' },
                          ]}
                        >
                          {statusKey}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Contact Phone (with dedicated +91 country code box) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {t('doctorPhoneLabel')} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInputField}
                    value={formPhone}
                    onChangeText={(text) => setFormPhone(text.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="98221 45678"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <Text style={styles.phoneHelpText}>
                  {formPhone.length}/10 digits • Enter 10-digit Indian mobile number
                </Text>
              </View>

              {/* Personal / Residential Address */}
              <View style={styles.subFormCard}>
                <View style={styles.subFormHeader}>
                  <Ionicons name="home" size={15} color="#0284C7" />
                  <Text style={styles.subFormTitle}>{t('doctorAddressSection')}</Text>
                </View>

                {/* Village / City */}
                <View style={styles.formGroup}>
                  <Text style={styles.innerLabel}>
                    {t('villageCityLabel')} <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.inputField}
                    value={formVillageCity}
                    onChangeText={setFormVillageCity}
                    placeholder="e.g. Kothrud, Pune / Village Wadgaon"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Taluka & District (2-Column Row) */}
                <View style={styles.twoColRow}>
                  <View style={styles.colHalf}>
                    <Text style={styles.innerLabel}>
                      {t('talukaLabel')} <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.inputField}
                      value={formTaluka}
                      onChangeText={setFormTaluka}
                      placeholder="e.g. Haveli"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={styles.innerLabel}>
                      {t('districtLabel')} <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.inputField}
                      value={formDistrict}
                      onChangeText={setFormDistrict}
                      placeholder="e.g. Pune"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                {/* Pincode (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.innerLabel}>{t('pincodeOptionalLabel')}</Text>
                  <TextInput
                    style={styles.inputField}
                    value={formPincode}
                    onChangeText={setFormPincode}
                    keyboardType="numeric"
                    maxLength={6}
                    placeholder="411038"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Submit & Cancel Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, savingDoctor && { opacity: 0.5 }]}
                  onPress={() => !savingDoctor && setModalVisible(false)}
                  disabled={savingDoctor}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText}>{t('cancel') || 'रद्द करा'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    (!isFormValid || savingDoctor) && styles.modalSubmitBtnDisabled,
                  ]}
                  onPress={handleSaveDoctor}
                  disabled={!isFormValid || savingDoctor}
                  activeOpacity={0.8}
                >
                  {savingDoctor ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.modalSubmitBtnText}>
                        {editingDoctorId
                          ? (t('updatingDoctor') || 'अद्यतन करत आहे...')
                          : (t('savingDoctor') || 'जतन करत आहे...')}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.modalSubmitBtnText}>
                        {editingDoctorId ? (t('updateDoctorBtn') || 'डॉक्टर माहिती अद्यतन करा') : (t('saveDoctorBtn') || 'डॉक्टर माहिती जतन करा')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
    fontWeight: '500',
  },
  addDoctorHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  addDoctorHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  availableBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenPulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filtersScrollContent: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterChipCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  filterChipCountActive: {
    backgroundColor: '#0369A1',
  },
  filterChipCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipCountTextActive: {
    color: '#FFFFFF',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doctorListContainer: {
    gap: 12,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  doctorCardDeactivated: {
    opacity: 0.75,
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  docAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  doctorNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  doctorNameTextDeactivated: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deactivatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  deactivatedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  qualificationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  specTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleTagOpd: {
    backgroundColor: '#E0F2FE',
  },
  roleTagIpd: {
    backgroundColor: '#EDE9FE',
  },
  roleTagBoth: {
    backgroundColor: '#DCFCE7',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roleTagTextOpd: {
    color: '#0284C7',
  },
  roleTagTextIpd: {
    color: '#7C3AED',
  },
  roleTagTextBoth: {
    color: '#059669',
  },
  shiftTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  timingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  timingBoxText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  addressContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addressCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  addressText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  phoneChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0284C7',
  },
  quickStatusContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  quickStatusRow: {
    gap: 6,
  },
  quickStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  quickStatusChipText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deactivateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  reactivateBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  reactivateBtnText: {
    color: '#16A34A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalScroll: {
    maxHeight: 520,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  innerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  requiredStar: {
    color: '#DC2626',
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  specChipsRow: {
    gap: 6,
    marginTop: 8,
    paddingBottom: 4,
  },
  specChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  specChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  specChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  specChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  segmentBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subFormCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  subFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  subFormTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  shiftPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  shiftPresetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  shiftPresetChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  shiftPresetChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  shiftPresetChipTextActive: {
    color: '#FFFFFF',
  },
  availabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  availSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  availSelectChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  colHalf: {
    flex: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.65,
    elevation: 0,
    shadowOpacity: 0,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  flagEmoji: {
    fontSize: 15,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInputField: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    letterSpacing: 0.5,
  },
  phoneHelpText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
});
