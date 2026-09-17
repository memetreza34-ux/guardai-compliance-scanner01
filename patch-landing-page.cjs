const fs = require('fs');
const lpPath = 'src/components/LandingPage.tsx';
let lp = fs.readFileSync(lpPath, 'utf8');
lp = lp.replace('interface LandingPageProps {', 'interface LandingPageProps {\n  onStartScan?: (target: string | File, options: ScanOptions) => void | Promise<void>;\n  isScanning?: boolean;\n}');
lp = lp.replace('  onStartScan: (target: string | File, options: ScanOptions) => void | Promise<void>;\n  isScanning: boolean;', '');
lp = lp.replace('export function LandingPage({ onStartScan, isScanning }: LandingPageProps) {', 'import { useNavigate } from "react-router-dom";\n\nexport function LandingPage({ onStartScan, isScanning = false }: LandingPageProps = {}) {\n  const navigate = useNavigate();\n  const handleStartScan = onStartScan || ((target) => { navigate("/login"); });\n');
lp = lp.replace('<UrlInputHero onStartScan={onStartScan} isScanning={isScanning} />', '<UrlInputHero onStartScan={handleStartScan} isScanning={isScanning} />');
fs.writeFileSync(lpPath, lp);

const uiPath = 'src/components/UrlInputHero.tsx';
let ui = fs.readFileSync(uiPath, 'utf8');
ui = ui.replace('interface UrlInputHeroProps {', 'export interface UrlInputHeroProps {\n  onStartScan?: (target: string | File, options: ScanOptions) => void | Promise<void>;\n  isScanning?: boolean;\n}');
ui = ui.replace('  onStartScan: (target: string | File, options: ScanOptions) => void | Promise<void>;\n  isScanning: boolean;', '');
ui = ui.replace('export const UrlInputHero: React.FC<UrlInputHeroProps> = ({ onStartScan, isScanning }) => {', 'export const UrlInputHero: React.FC<UrlInputHeroProps> = ({ onStartScan, isScanning = false }) => {');
ui = ui.replace('void onStartScan(value, { ...scanOptions, fileMode: false });', 'if (onStartScan) void onStartScan(value, { ...scanOptions, fileMode: false });');
ui = ui.replace('void onStartScan(file, FILE_SCAN_OPTIONS);', 'if (onStartScan) void onStartScan(file, FILE_SCAN_OPTIONS);');
fs.writeFileSync(uiPath, ui);
