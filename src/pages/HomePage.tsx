import {
  makeStyles,
  Title1,
  Body1,
  Caption1,
  Subtitle2,
  Card,
  CardHeader,
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  Tooltip,
  tokens,
} from '@fluentui/react-components';
import {
  Navigation24Regular,
} from '@fluentui/react-icons';
import { SYSTEMS } from '../lib/systems';
import type { PageId } from '../components/SideNav';
import { SystemIcon } from '../components/SystemIcon';

interface HomePageProps {
  onMenuClick: () => void;
  onNavigate: (page: PageId) => void;
}

const useStyles = makeStyles({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'auto',
  },
  toolbar: {
    height: '46px',
    backgroundColor: 'rgba(6, 6, 14, 0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    padding: '0 8px',
  },
  title: {
    fontSize: tokens.fontSizeBase200,
    letterSpacing: '0.12em',
    color: tokens.colorBrandForeground1,
    textTransform: 'uppercase' as const,
    marginLeft: '4px',
  },
  content: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  heading: {
    letterSpacing: '0.05em',
  },
  description: {
    lineHeight: '1.7',
    opacity: 0.85,
  },
  sectionTitle: {
    marginTop: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '12px',
  },
  card: {
    cursor: 'pointer',
    ':hover': {
      borderTopColor: tokens.colorBrandForeground1,
      borderRightColor: tokens.colorBrandForeground1,
      borderBottomColor: tokens.colorBrandForeground1,
      borderLeftColor: tokens.colorBrandForeground1,
    },
  },
});

export function HomePage({ onMenuClick, onNavigate }: HomePageProps) {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Toolbar className={styles.toolbar} aria-label="Home toolbar">
        <ToolbarGroup>
          <Tooltip content="Open navigation" relationship="label">
            <ToolbarButton
              appearance="subtle"
              icon={<Navigation24Regular />}
              onClick={onMenuClick}
              aria-label="Open navigation"
            />
          </Tooltip>
          <span className={styles.title}>Home</span>
        </ToolbarGroup>
      </Toolbar>

      <div className={styles.content}>
        <Title1 className={styles.heading}>Strange Attractor Explorer</Title1>

        <Body1 className={styles.description}>
          SAE is an interactive 3D visualizer for chaotic dynamical systems.
          Click anywhere on the canvas to generate a trajectory from that
          point, adjust iterations, line width, and color, then watch the
          attractor take shape in real time.
        </Body1>

        <Body1 className={styles.description}>
          Each system implements a set of differential equations (or a discrete
          map) that exhibit sensitive dependence on initial conditions — small
          changes in starting position produce wildly different paths, all
          confined to a fractal structure called a strange attractor.
        </Body1>

        <Subtitle2 className={styles.sectionTitle}>Systems</Subtitle2>

        <div className={styles.grid}>
          {SYSTEMS.map((sys) => (
            <Card
              key={sys.id}
              className={styles.card}
              size="small"
              onClick={() => onNavigate(sys.id)}
            >
              <CardHeader
                image={<SystemIcon name={sys.icon} />}
                header={<Subtitle2>{sys.label}</Subtitle2>}
                description={<Caption1>{sys.description}</Caption1>}
              />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}