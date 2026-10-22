import { scaledPixels } from '../hooks/useScale';
import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import { View, StyleSheet, Platform, Text } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { DrawerParamList } from '../navigation/types';
import { useMenuContext } from '../components/MenuContext';
import { safeZones, colors } from '../theme';
import { useCallback, useRef } from 'react';
import { Direction } from '@bam.tech/lrud';
import { getCloseDrawerDirection } from '../utils/rtl';

// Tagline ka rang yahan se badlo
const BRAND_ACCENT = '#FF8A1F';

// Cute cat + dog jo saath me screen dekh rahe hain (original illustration)
function WatchBuddies() {
  return (
    <Svg width={scaledPixels(180)} height={scaledPixels(106)} viewBox="0 0 220 130">
      {/* soft background + ground shadow */}
      <Circle cx="110" cy="64" r="58" fill="#16233F" />
      <Ellipse cx="110" cy="124" rx="86" ry="6" fill="#000000" opacity={0.3} />

      {/* tails */}
      <Path d="M48 106 Q28 102 34 84" stroke="#2B2F5E" strokeWidth="10" strokeLinecap="round" fill="none" />
      <Path d="M48 106 Q28 102 34 84" stroke="#9A9CC8" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Path d="M172 106 Q192 102 186 84" stroke="#5A2E12" strokeWidth="10" strokeLinecap="round" fill="none" />
      <Path d="M172 106 Q192 102 186 84" stroke="#F29A3C" strokeWidth="6" strokeLinecap="round" fill="none" />

      {/* bodies */}
      <Ellipse cx="72" cy="98" rx="26" ry="24" fill="#9A9CC8" stroke="#2B2F5E" strokeWidth="2.5" />
      <Ellipse cx="148" cy="98" rx="26" ry="24" fill="#F29A3C" stroke="#5A2E12" strokeWidth="2.5" />

      {/* cat ears */}
      <Polygon points="52,50 54,24 72,40" fill="#A9ABD6" stroke="#2B2F5E" strokeWidth="2.5" strokeLinejoin="round" />
      <Polygon points="92,50 90,24 72,40" fill="#A9ABD6" stroke="#2B2F5E" strokeWidth="2.5" strokeLinejoin="round" />
      <Polygon points="57,44 58,31 66,40" fill="#F4A6C0" />
      <Polygon points="87,44 86,31 78,40" fill="#F4A6C0" />

      {/* cat head */}
      <Circle cx="72" cy="62" r="24" fill="#A9ABD6" stroke="#2B2F5E" strokeWidth="2.5" />
      <Circle cx="64" cy="62" r="4" fill="#2B2F5E" />
      <Circle cx="80" cy="62" r="4" fill="#2B2F5E" />
      <Circle cx="65.3" cy="60.7" r="1.3" fill="#FFFFFF" />
      <Circle cx="81.3" cy="60.7" r="1.3" fill="#FFFFFF" />
      <Polygon points="69,69 75,69 72,73" fill="#F4A6C0" />
      <Path d="M67 75 Q72 79 77 75" stroke="#2B2F5E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <Line x1="54" y1="68" x2="41" y2="65" stroke="#2B2F5E" strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="54" y1="72" x2="41" y2="75" stroke="#2B2F5E" strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="90" y1="68" x2="103" y2="65" stroke="#2B2F5E" strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="90" y1="72" x2="103" y2="75" stroke="#2B2F5E" strokeWidth="1.5" strokeLinecap="round" />

      {/* dog head */}
      <Circle cx="148" cy="62" r="24" fill="#F6A94B" stroke="#5A2E12" strokeWidth="2.5" />
      <Ellipse cx="126" cy="62" rx="9" ry="18" fill="#B9692A" stroke="#5A2E12" strokeWidth="2.5" rotation="14" origin="126, 62" />
      <Ellipse cx="170" cy="62" rx="9" ry="18" fill="#B9692A" stroke="#5A2E12" strokeWidth="2.5" rotation="-14" origin="170, 62" />
      <Circle cx="140" cy="60" r="4" fill="#3A2A55" />
      <Circle cx="156" cy="60" r="4" fill="#3A2A55" />
      <Circle cx="141.3" cy="58.7" r="1.3" fill="#FFFFFF" />
      <Circle cx="157.3" cy="58.7" r="1.3" fill="#FFFFFF" />
      <Ellipse cx="148" cy="72" rx="10" ry="7" fill="#FFE2B8" />
      <Ellipse cx="148" cy="68.5" rx="4" ry="3" fill="#3A2A55" />
      <Path d="M143 75 Q148 80 153 75" stroke="#5A2E12" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* laptop */}
      <Rect x="82" y="86" width="56" height="34" rx="4" fill="#D9DCE3" stroke="#2B2F5E" strokeWidth="2.5" />
      <Rect x="87" y="90" width="46" height="24" rx="2" fill="#0F172A" />
      <Polygon points="104,95 104,109 118,102" fill="#7DE2D1" />
      <Rect x="76" y="120" width="68" height="5" rx="2.5" fill="#B8BCC8" stroke="#2B2F5E" strokeWidth="1.5" />
    </Svg>
  );
}

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const navigation = props.navigation;
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const styles = drawerStyles;
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHoverIn = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleHoverOut = () => {
    closeTimerRef.current = setTimeout(() => {
      navigation.closeDrawer();
      toggleMenu(false);
    }, 2000);
  };
  const drawerItems = [
    { name: 'Home', label: 'Home' },
    { name: 'Explore', label: 'Explore' },
    { name: 'Decision', label: 'Watch Together' },
    { name: 'TV', label: 'TV' },
  ] as const;

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === getCloseDrawerDirection()) {
        navigation.closeDrawer();
        toggleMenu(false);
      }
    },
    [navigation, toggleMenu],
  );

  return (
    <SpatialNavigationRoot isActive={isMenuOpen} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View
        style={styles.drawerContainer}
        {...(Platform.OS === 'web' ? ({ onMouseEnter: handleHoverIn, onMouseLeave: handleHoverOut } as any) : {})}
      >
        {/* Gradient-like scrim overlay */}
        <View style={styles.scrimOverlay} />
        <DrawerContentScrollView
          {...props}
          style={styles.container}
          scrollEnabled={false}
          contentContainerStyle={{
            ...(Platform.OS === 'ios' && Platform.isTV && { paddingStart: 0, paddingEnd: 0, paddingTop: 0 }),
          }}
        >
          <View style={styles.header}>
            <WatchBuddies />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName} numberOfLines={1} ellipsizeMode="tail">
                SabkiScreen
              </Text>
              <Text style={styles.brandTagline} numberOfLines={1}>
                AI • Watch together
              </Text>
            </View>
            {isMenuOpen && (
              <>
                <Text style={styles.userName} numberOfLines={1}>Pioneer Tom</Text>
                <Text style={styles.switchAccount} numberOfLines={1}>Switch account</Text>
              </>
            )}
          </View>
          {drawerItems.map((item, index) =>
            index === 0 ? (
              <DefaultFocus key={index}>
                <SpatialNavigationFocusableView
                  onSelect={() => {
                    navigation.jumpTo(item.name as keyof DrawerParamList);
                    navigation.closeDrawer();
                    toggleMenu(false);
                  }}
                >
                  {({ isFocused }) => (
                    <View style={[styles.menuItem, isFocused && styles.menuItemFocused]}>
                      <Text
                        style={[styles.menuText, isFocused && styles.menuTextFocused]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {item.label}
                      </Text>
                    </View>
                  )}
                </SpatialNavigationFocusableView>
              </DefaultFocus>
            ) : (
              <SpatialNavigationFocusableView
                key={index}
                onSelect={() => {
                  navigation.jumpTo(item.name as keyof DrawerParamList);
                  navigation.closeDrawer();
                  toggleMenu(false);
                }}
              >
                {({ isFocused }) => (
                  <View style={[styles.menuItem, isFocused && styles.menuItemFocused]}>
                    <Text
                      style={[styles.menuText, isFocused && styles.menuTextFocused]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {item.label}
                    </Text>
                  </View>
                )}
              </SpatialNavigationFocusableView>
            ),
          )}
        </DrawerContentScrollView>

        {/* Settings button at bottom */}
        <View style={styles.footer}>
          <SpatialNavigationFocusableView
            onSelect={() => {
              navigation.jumpTo('Settings');
              navigation.closeDrawer();
              toggleMenu(false);
            }}
          >
            {({ isFocused }) => (
              <View style={[styles.settingsButton, isFocused && styles.settingsButtonFocused]}>
                <View style={styles.cogIcon}>
                  <Text style={[styles.cogIconText, isFocused && styles.cogIconTextFocused]}>⚙</Text>
                </View>
              </View>
            )}
          </SpatialNavigationFocusableView>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const drawerStyles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  scrimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    opacity: 0.9,
  },
  container: {
    flex: 1,
    paddingTop: scaledPixels(safeZones.titleSafe.vertical),
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: scaledPixels(32),
    paddingVertical: scaledPixels(24),
    marginBottom: scaledPixels(16),
  },
  brandCopy: {
    alignItems: 'center',
    marginTop: scaledPixels(12),
    maxWidth: '100%',
  },
  brandName: {
    color: colors.text,
    fontSize: scaledPixels(45),
    fontWeight: '800',
    textAlign: 'center',
    flexShrink: 1,
  },
  brandTagline: {
    color: BRAND_ACCENT,
    fontSize: scaledPixels(28),
    fontWeight: '700',
    marginTop: scaledPixels(6),
    textAlign: 'center',
    flexShrink: 1,
  },
  userName: {
    color: colors.text,
    fontSize: scaledPixels(30),
    fontWeight: '600',
    marginTop: scaledPixels(24),
    textAlign: 'center',
    maxWidth: '100%',
    flexShrink: 1,
  },
  switchAccount: {
    color: colors.textSecondary,
    fontSize: scaledPixels(22),
    marginTop: scaledPixels(8),
    textAlign: 'center',
    maxWidth: '100%',
  },
  searchContainer: {
    backgroundColor: colors.cardElevated,
    padding: scaledPixels(16),
    marginHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    marginVertical: scaledPixels(12),
    borderRadius: scaledPixels(8),
  },
  searchText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(20),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaledPixels(20),
    paddingHorizontal: scaledPixels(32),
    marginHorizontal: scaledPixels(20),
    marginVertical: scaledPixels(6),
    borderRadius: scaledPixels(8),
    minHeight: scaledPixels(72),
    borderWidth: scaledPixels(3),
    borderColor: 'transparent',
  },
  menuItemFocused: {
    backgroundColor: colors.focusBackground,
    borderColor: colors.focusBorder,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.focus,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: scaledPixels(12),
    elevation: 8,
  },
  icon: {
    width: scaledPixels(32),
    height: scaledPixels(32),
    marginEnd: scaledPixels(20),
  },
  menuText: {
    color: colors.text,
    fontSize: scaledPixels(34),
    fontWeight: '500',
    flexShrink: 1,
  },
  menuTextFocused: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: scaledPixels(16),
    paddingBottom: scaledPixels(safeZones.actionSafe.vertical),
    paddingTop: scaledPixels(16),
    borderTopWidth: scaledPixels(2),
    borderTopColor: colors.border,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaledPixels(20),
    paddingHorizontal: scaledPixels(24),
    borderRadius: scaledPixels(8),
    minHeight: scaledPixels(72),
    borderWidth: scaledPixels(3),
    borderColor: 'transparent',
  },
  settingsButtonFocused: {
    backgroundColor: colors.focusBackground,
    borderColor: colors.focusBorder,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.focus,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: scaledPixels(12),
    elevation: 8,
  },
  cogIcon: {
    width: scaledPixels(64),
    height: scaledPixels(64),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cogIconText: {
    fontSize: scaledPixels(48),
    color: colors.text,
  },
  cogIconTextFocused: {
    color: colors.textOnPrimary,
  },
});