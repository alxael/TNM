import {
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  ToolbarGroup,
  ToolbarToggleButton,
  makeStyles,
  CounterBadge,
  Tooltip,
  tokens,
} from '@fluentui/react-components';
import {
  Navigation24Regular,
  Settings24Regular,
  Delete24Regular,
  GridDots20Regular,
  LineHorizontal120Regular,
  Info24Regular,
} from '@fluentui/react-icons';

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
  renderMode: 'points' | 'line';
  onRenderModeChange: (mode: 'points' | 'line') => void;
  supportedModes: Array<'points' | 'line'>;
  onClear: () => void;
  onPathsClick: () => void;
  onSettingsClick: () => void;
  onInfoClick: () => void;
  pathCount: number;
}

const useStyles = makeStyles({
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46px',
    backgroundColor: 'rgba(6, 6, 14, 0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
  },
  title: {
    flex: 1,
    fontSize: tokens.fontSizeBase200,
    letterSpacing: '0.12em',
    color: tokens.colorBrandForeground1,
    textTransform: 'uppercase' as const,
    marginLeft: '4px',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  pathsBtnWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
});

export function TopBar({
  title,
  onMenuClick,
  renderMode,
  onRenderModeChange,
  supportedModes,
  onClear,
  onPathsClick,
  onSettingsClick,
  onInfoClick,
  pathCount,
}: TopBarProps) {
  const styles = useStyles();

  return (
    <Toolbar className={styles.toolbar} aria-label="Page toolbar">
      <ToolbarGroup>
        <Tooltip content="Open navigation" relationship="label">
          <ToolbarButton
            appearance="subtle"
            icon={<Navigation24Regular />}
            onClick={onMenuClick}
            aria-label="Open navigation"
          />
        </Tooltip>
        <span className={styles.title}>{title}</span>
      </ToolbarGroup>

      <ToolbarGroup className={styles.rightGroup}>
        {supportedModes.includes('points') && (
          <Tooltip content="Points mode" relationship="label">
            <ToolbarToggleButton
              appearance={renderMode === 'points' ? 'primary' : 'subtle'}
              name="renderMode"
              value="points"
              icon={<GridDots20Regular />}
              onClick={() => onRenderModeChange('points')}
              size="small"
            >
              Points
            </ToolbarToggleButton>
          </Tooltip>
        )}

        {supportedModes.includes('line') && (
          <Tooltip content="Line mode" relationship="label">
            <ToolbarToggleButton
              appearance={renderMode === 'line' ? 'primary' : 'subtle'}
              name="renderMode"
              value="line"
              icon={<LineHorizontal120Regular />}
              onClick={() => onRenderModeChange('line')}
              size="small"
            >
              Lines
            </ToolbarToggleButton>
          </Tooltip>
        )}

        <ToolbarDivider />

        <Tooltip content="Clear all paths" relationship="label">
          <ToolbarButton
            appearance="subtle"
            icon={<Delete24Regular />}
            onClick={onClear}
          >
            Clear
          </ToolbarButton>
        </Tooltip>

        <ToolbarButton appearance="subtle" onClick={onPathsClick}>
          <span className={styles.pathsBtnWrap}>
            Paths
            {pathCount > 0 && (
              <CounterBadge count={pathCount} size="small" color="danger" />
            )}
          </span>
        </ToolbarButton>

        <Tooltip content="System info" relationship="label">
          <ToolbarButton
            appearance="subtle"
            icon={<Info24Regular />}
            onClick={onInfoClick}
            aria-label="System info"
          />
        </Tooltip>

        <Tooltip content="Settings" relationship="label">
          <ToolbarButton
            appearance="subtle"
            icon={<Settings24Regular />}
            onClick={onSettingsClick}
            aria-label="Settings"
          />
        </Tooltip>
      </ToolbarGroup>
    </Toolbar>
  );
}
