import { scaledPixels } from '../hooks/useScale';
import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { DrawerParamList } from '../navigation/types';
import { useMenuContext } from '../components/MenuContext';
import { safeZones, colors } from '../theme';
import { useCallback, useRef } from 'react';
import { Direction } from '@bam.tech/lrud';
import { getCloseDrawerDirection } from '../utils/rtl';

function TVIcon() {
  return (
    <View style={tvIconStyles.wrapper}>
      <View style={tvIconStyles.screen}>
        <View style={tvIconStyles.screenInner} />
      </View>
      <View style={tvIconStyles.stand} />
      <View style={tvIconStyles.base} />
    </View>
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
            <View style={styles.brandRow}>
              <TVIcon />
              <View style={styles.brandCopy}>
                <Text style={styles.brandName} numberOfLines={1} ellipsizeMode="tail">
                  SabkiScreen
                </Text>
                <Text style={styles.brandTagline} numberOfLines={1}>
                  AI • Watch together
                </Text>
              </View>
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
                      <Text style={[styles.menuText, isFocused && styles.menuTextFocused]}>{item.label}</Text>
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
                    <Text style={[styles.menuText, isFocused && styles.menuTextFocused]}>{item.label}</Text>
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

const tvIconStyles = StyleSheet.create({
  wrapper: {
    width: scaledPixels(76),
    height: scaledPixels(76),
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    width: scaledPixels(64),
    height: scaledPixels(44),
    borderRadius: scaledPixels(8),
    borderWidth: scaledPixels(3),
    borderColor: '#7DE2D1',
    backgroundColor: '#0B1A18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenInner: {
    width: '70%',
    height: '55%',
    borderRadius: scaledPixels(3),
    backgroundColor: '#7DE2D1',
    opacity: 0.35,
  },
  stand: {
    width: scaledPixels(3),
    height: scaledPixels(10),
    backgroundColor: '#7DE2D1',
    marginTop: scaledPixels(2),
  },
  base: {
    width: scaledPixels(28),
    height: scaledPixels(3),
    borderRadius: scaledPixels(2),
    backgroundColor: '#7DE2D1',
  },
});

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
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    paddingVertical: scaledPixels(28),
    marginBottom: scaledPixels(16),
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandCopy: {
    marginStart: scaledPixels(16),
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  brandName: {
    color: colors.text,
    fontSize: scaledPixels(18),
    fontWeight: '800',
    flexShrink: 1,
  },
  brandTagline: {
    color: '#7DE2D1',
    fontSize: scaledPixels(13),
    fontWeight: '700',
    marginTop: scaledPixels(5),
    flexShrink: 1,
  },
  userName: {
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: '600',
    marginTop: scaledPixels(28),
    flexShrink: 1,
  },
  switchAccount: {
    color: colors.textSecondary,
    fontSize: scaledPixels(22),
    marginTop: scaledPixels(8),
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
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    marginHorizontal: scaledPixels(16),
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
    fontSize: scaledPixels(36),
    fontWeight: '500',
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
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
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