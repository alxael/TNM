import {
  Card,
  CardHeader,
  Slider,
  Field,
  Body1,
  Caption1,
  Subtitle2,
  ColorSwatch,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

interface SettingsPanelProps {
  iterations: number;
  onIterationsChange: (value: number) => void;
  color: string;
  onColorChange: (value: string) => void;
  lineWidth: number;
  onLineWidthChange: (value: number) => void;
}

const PALETTE = [
  '#ff6030', '#ff4466', '#ff9020', '#ffcc00',
  '#44ff66', '#30ccff', '#6644ff', '#ff44cc',
  '#ffffff', '#88aacc',
];

const useStyles = makeStyles({
  card: {
    position: 'absolute',
    top: '54px',
    right: '12px',
    zIndex: 150,
    width: '280px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderColor: tokens.colorNeutralStroke2,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '0 16px 16px',
  },
  swatchGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
});

export function SettingsPanel({
  iterations,
  onIterationsChange,
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
}: SettingsPanelProps) {
  const styles = useStyles();

  return (
    <Card className={styles.card} size="small">
      <CardHeader header={<Subtitle2>Settings</Subtitle2>} />

      <div className={styles.content}>
        <Field
          label="Iterations"
          hint="More = denser sheet, slower compute"
        >
          <Body1>{iterations.toLocaleString()}</Body1>
          <Slider
            min={100}
            max={10000}
            step={100}
            value={iterations}
            onChange={(_, data) => onIterationsChange(data.value)}
          />
        </Field>

        <Field
          label="Line width"
          hint="Thickness of line-mode paths (px)"
        >
          <Body1>{lineWidth}px</Body1>
          <Slider
            min={1}
            max={10}
            step={0.5}
            value={lineWidth}
            onChange={(_, data) => onLineWidthChange(data.value)}
          />
        </Field>

        <Field
          label="Path color"
          hint="Hue shifts along the path"
        >
          <div className={styles.swatchGrid}>
            {PALETTE.map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                value={c}
                aria-label={c}
                size="medium"
                selected={c === color}
                onClick={() => onColorChange(c)}
                style={{ borderColor: c === color ? tokens.colorBrandForeground1 : 'transparent' }}
              />
            ))}
          </div>
          <Caption1 style={{ marginTop: 4 }}>
            Selected: <span style={{ color }}>{color}</span>
          </Caption1>
        </Field>
      </div>
    </Card>
  );
}
