import { useState, useCallback } from 'react';
import { makeStyles } from '@fluentui/react-components';
import { SideNav, type PageId } from './components/SideNav';
import { AttractorPage } from './pages/FoldedTowelMapPage';
import { HomePage } from './pages/HomePage';
import { getMap } from './lib/mapDefinition';
// ensure all maps are registered
import './lib/systems';

const useStyles = makeStyles({
  root: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#06060e',
  },
});

export default function App() {
  const styles = useStyles();
  const [navOpen, setNavOpen] = useState(false);
  const [activePage, setActivePage] = useState<PageId>('folded-towel');

  const handleNavigate = useCallback((pageId: PageId) => {
    setActivePage(pageId);
    setNavOpen(false);
  }, []);

  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);

  const mapDef = activePage !== 'home' ? getMap(activePage) : undefined;

  return (
    <div className={styles.root}>
      <SideNav
        open={navOpen}
        activePage={activePage}
        onNavigate={handleNavigate}
        onOpenChange={setNavOpen}
      />
      {activePage === 'home' && (
        <HomePage onMenuClick={toggleNav} onNavigate={handleNavigate} />
      )}
      {mapDef && (
        <AttractorPage key={mapDef.id} mapDef={mapDef} onMenuClick={toggleNav} />
      )}
    </div>
  );
}
