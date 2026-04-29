import {
  Card,
  CardHeader,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Caption1,
  Subtitle2,
  Badge,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Delete20Regular } from '@fluentui/react-icons';
import type { PathEntry } from '../lib/pathManager';

interface PathsPanelProps {
  paths: ReadonlyArray<PathEntry>;
  onRemovePath: (id: number) => void;
}

const useStyles = makeStyles({
  card: {
    position: 'absolute',
    top: '54px',
    right: '12px',
    zIndex: 150,
    width: '320px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderColor: tokens.colorNeutralStroke2,
  },
  tableWrap: {
    padding: '0 8px 12px',
  },
  colorDot: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    verticalAlign: 'middle',
  },
  emptyRow: {
    textAlign: 'center' as const,
    padding: '16px 0',
  },
});

const columns = [
  { columnKey: 'id', label: '#' },
  { columnKey: 'color', label: 'Color' },
  { columnKey: 'iterations', label: 'Iterations' },
  { columnKey: 'actions', label: '' },
];

export function PathsPanel({ paths, onRemovePath }: PathsPanelProps) {
  const styles = useStyles();

  return (
    <Card className={styles.card} size="small">
      <CardHeader header={<Subtitle2>Active Paths</Subtitle2>} />

      <div className={styles.tableWrap}>
        {paths.length === 0 ? (
          <div className={styles.emptyRow}>
            <Caption1>No paths — click the canvas</Caption1>
          </div>
        ) : (
          <Table size="small" aria-label="Active paths">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHeaderCell key={col.columnKey}>{col.label}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paths.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge appearance="outline" size="small">
                      {p.id}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={styles.colorDot} style={{ background: p.color }} />
                  </TableCell>
                  <TableCell>
                    <Caption1>{p.iterations.toLocaleString()}</Caption1>
                  </TableCell>
                  <TableCell>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Delete20Regular />}
                      onClick={() => onRemovePath(p.id)}
                      aria-label={`Remove path ${p.id}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}
