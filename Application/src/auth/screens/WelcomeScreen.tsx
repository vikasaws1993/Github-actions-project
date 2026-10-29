import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage, LANGUAGE_OPTIONS } from '../../shared/context/LanguageContext';
import { APP_CONFIG } from '../../shared/constants/config';
import { useMlaProfile } from '../../shared/hooks/useMlaProfile';
import { useResponsiveDimensions } from '../../shared/theme/responsive';

interface WelcomeScreenProps {
  navigation?: any;
  onStart?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation, onStart }) => {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const { height: screenHeight, isSmallDevice } = useResponsiveDimensions();
  const { profile: mlaProfile } = useMlaProfile();

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );
  const bottomInset = Math.max(insets.bottom, 20);

  const handleStart = () => {
    if (onStart) {
      onStart();
    } else if (navigation) {
      navigation.navigate('Login');
    }
  };

  const photoMinHeight = isSmallDevice ? screenHeight * 0.30 : screenHeight * 0.36;
  const photoMaxHeight = isSmallDevice ? screenHeight * 0.40 : screenHeight * 0.46;

  // Resolve photo image source safely
  const photoSource = React.useMemo(() => {
    const pUrl = mlaProfile?.photoUrl;
    if (pUrl && (pUrl.startsWith('http://') || pUrl.startsWith('https://'))) {
      return { uri: pUrl };
    }
    if (pUrl && pUrl.startsWith('/') && !pUrl.includes('.svg')) {
      const host = APP_CONFIG.API_BASE_URL.replace(/\/api\/?$/, '');
      return { uri: `${host}${pUrl}` };
    }
    return require('../../../assets/ravindra_chavan.jpg');
  }, [mlaProfile?.photoUrl]);

  // Resolve localized text based on selected language
  const leaderName = language === 'mr'
    ? (mlaProfile?.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण')
    : language === 'hi'
    ? (mlaProfile?.nameHi || mlaProfile?.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण')
    : (mlaProfile?.name || 'Hon. Ravindra Dattatray Chavan');

  const partyTitleText = language === 'mr'
    ? (mlaProfile?.partyTitleMr || mlaProfile?.partyTitle || 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा')
    : language === 'hi'
    ? (mlaProfile?.partyTitleHi || mlaProfile?.partyTitleMr || 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा')
    : (mlaProfile?.partyTitle || 'State President of BJP Maharashtra | Dombivli Assembly Constituency');

  const initiativeText = language === 'mr'
    ? (mlaProfile?.initiativeTitleMr || 'विशेष पुढाकार')
    : language === 'hi'
    ? (mlaProfile?.initiativeTitleHi || 'विशेष पहल')
    : (mlaProfile?.initiativeTitle || 'Special Initiative');

  const taglineText = language === 'mr'
    ? (mlaProfile?.taglineMr || t('leaderTagline') || 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.')
    : language === 'hi'
    ? (mlaProfile?.taglineHi || t('leaderTagline') || 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।')
    : (mlaProfile?.tagline || t('leaderTagline') || 'Dedicated to your health, we are committed.');

  const footerText = language === 'mr'
    ? `सहकार्य: ${leaderName}`
    : language === 'hi'
    ? `सहयोग: ${leaderName}`
    : `Supported by: ${leaderName}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: topInset + 8,
            paddingBottom: bottomInset + 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1. Top Brand & Language Selector Bar */}
        <View style={styles.topHeaderBar}>
          <Image
            source={require('../../../assets/arogya_mitra_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          {/* 3-Language Segmented Toggle */}
          <View style={styles.langSegmentContainer}>
            <Ionicons name="globe-outline" size={13} color="#64748B" style={styles.globeIcon} />
            {LANGUAGE_OPTIONS.map((opt) => {
              const isSelected = language === opt.code;
              return (
                <TouchableOpacity
                  key={opt.code}
                  style={[
                    styles.langSegmentBtn,
                    isSelected && styles.langSegmentBtnActive,
                  ]}
                  onPress={() => setLanguage(opt.code)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.langSegmentText,
                      isSelected && styles.langSegmentTextActive,
                    ]}
                  >
                    {opt.pillLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Center: Prominent Photo of Leader */}
        <View style={[styles.photoContainer, { minHeight: photoMinHeight, maxHeight: photoMaxHeight }]}>
          <Image
            source={photoSource}
            style={styles.leaderImage}
            resizeMode="contain"
          />
        </View>

        {/* 3. Bottom Leadership & Details Card */}
        <View style={styles.bottomCard}>
          {/* Initiative Badge */}
          <View style={styles.initiativeBadge}>
            <View style={styles.initiativeDot} />
            <Text style={styles.initiativeBadgeText}>{initiativeText}</Text>
          </View>

          {/* Leader Name (Single language, matching current language selection) */}
          <Text style={styles.leaderName}>{leaderName}</Text>

          {/* State President & Constituency Title */}
          <View style={styles.partyTitleWrap}>
            <Text style={styles.leaderPartyTitle}>
              <Ionicons name="shield-checkmark" size={13} color="#0A665A" />
              {'  '}
              {partyTitleText}
            </Text>
          </View>

          {/* Tagline */}
          <Text style={styles.leaderTagline}>{taglineText}</Text>

          {/* Primary Action Button: सुरू करा */}
          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.88}
            onPress={handleStart}
          >
            <Text style={styles.startBtnText}>{t('startAppBtn') || 'सुरू करा'}</Text>
          </TouchableOpacity>

          {/* Footer Note */}
          <Text style={styles.footerNote}>{footerText}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  topHeaderBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  logoImage: {
    width: 92,
    height: 48,
  },
  langSegmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  globeIcon: {
    marginLeft: 5,
    marginRight: 2,
  },
  langSegmentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
  },
  langSegmentBtnActive: {
    backgroundColor: '#0A665A',
    elevation: 2,
    shadowColor: '#0A665A',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  langSegmentText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  langSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  photoContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginVertical: 4,
  },
  leaderImage: {
    width: '100%',
    height: '100%',
  },
  bottomCard: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  initiativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 6,
  },
  initiativeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  initiativeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  leaderName: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#0A3A5C',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 2,
    marginBottom: 4,
  },
  partyTitleWrap: {
    width: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  leaderPartyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 17,
  },
  leaderTagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  startBtn: {
    backgroundColor: '#0A665A',
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A665A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  footerNote: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default WelcomeScreen;
