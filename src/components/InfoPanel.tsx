import {
  Card,
  CardHeader,
  Caption1,
  Caption2,
  Body1,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { MapDefinition } from '../lib/mapDefinition';

interface InfoPanelProps {
  info: MapDefinition['info'];
}

const useStyles = makeStyles({
  card: {
    position: 'absolute',
    top: '54px',
    right: '12px',
    zIndex: 150,
    width: '320px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '0 16px 16px',
  },
  eq: {
    display: 'block',
    lineHeight: '1.8',
    opacity: 0.7,
  },
  params: {
    marginTop: '8px',
    display: 'block',
    color: tokens.colorBrandForeground1,
  },
  note: {
    marginTop: '8px',
    display: 'block',
    lineHeight: '1.6',
  },
});

export function InfoPanel({ info }: InfoPanelProps) {
  const styles = useStyles();

  return (
    <Card className={styles.card} size="small">
      <CardHeader header={<Subtitle2>Equations</Subtitle2>} />
      <div className={styles.content}>
        {info.equations.map((eq, i) => (
          <Caption1 key={i} className={styles.eq}>{eq}</Caption1>
        ))}
        <Body1 className={styles.params}>{info.parameters}</Body1>
        {info.lyapunov && (
          <Caption2 className={styles.note}>{info.lyapunov}</Caption2>
        )}
        {info.notes && (
          <Caption2 className={styles.note}>{info.notes}</Caption2>
        )}
      </div>
    </Card>
  );
}
