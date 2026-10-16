import React from 'react';
import { createRoot } from 'react-dom/client';
import {GameApp} from '../components/game/game-app';
import {MinimalDemo} from '../components/game/minimal-demo';
import CityPage from '../app/city/page';
import { DestinationScene } from '../components/destination-scene';
import type { DestinationId } from '../lib/map-data';
import '../app/globals.css';

const scene = window.location.pathname.match(/^\/place\/(work|hospital|leisure|finance)\/?$/)?.[1] as DestinationId | undefined;
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{window.location.pathname.startsWith("/demo") ? <MinimalDemo/> : scene ? <DestinationScene destination={scene} /> : window.location.pathname.startsWith("/city") ? <CityPage/> : <GameApp/>}</React.StrictMode>,
);
