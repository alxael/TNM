import {
  NavDrawer,
  NavDrawerBody,
  NavDrawerHeader,
  NavItem,
  NavSectionHeader,
  NavDivider,
  Button,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  Home24Regular,
} from '@fluentui/react-icons';
import { SYSTEMS } from '../lib/systems';
import { SystemIcon } from './SystemIcon';

export type PageId = string;

interface SideNavProps {
  open: boolean;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenChange: (open: boolean) => void;
}

const useStyles = makeStyles({
  drawer: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px 4px 16px',
  },
  brandTitle: {
    letterSpacing: '0.15em',
  },
});

export function SideNav({ open, activePage, onNavigate, onOpenChange }: SideNavProps) {
  const styles = useStyles();

  return (
    <NavDrawer
      open={open}
      onOpenChange={(_, data) => onOpenChange(data.open)}
      type="overlay"
      className={styles.drawer}
      selectedValue={activePage}
    >
      <NavDrawerHeader>
        <div className={styles.headerRow}>
          <Title3 className={styles.brandTitle}>SAE</Title3>
          <Button
            appearance="subtle"
            icon={<Dismiss24Regular />}
            onClick={() => onOpenChange(false)}
            aria-label="Close navigation"
          />
        </div>
      </NavDrawerHeader>

      <NavDrawerBody>
        <NavItem
          value="home"
          icon={<Home24Regular />}
          onClick={() => onNavigate('home')}
        >
          Home
        </NavItem>

        <NavDivider />

        <NavSectionHeader>Systems</NavSectionHeader>

        {SYSTEMS.map((sys) => (
          <NavItem
            key={sys.id}
            value={sys.id}
            icon={<SystemIcon name={sys.icon} />}
            onClick={() => onNavigate(sys.id)}
          >
            {sys.label}
          </NavItem>
        ))}


      </NavDrawerBody>
    </NavDrawer>
  );
}
