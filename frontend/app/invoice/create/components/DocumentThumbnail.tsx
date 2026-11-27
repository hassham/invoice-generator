import { getDefaultCustomization } from "../lib/templateCustomization";
import { getDocumentLayout } from "../lib/documentLayouts";

export function DocumentThumbnail({ templateCode }: { templateCode: string }) {
  const layout = getDocumentLayout(templateCode);
  const { primaryColor, accentColor } = getDefaultCustomization(templateCode);
  const ledger = layout === "ledger";
  const studio = layout === "studio";
  const horizon = layout === "horizon";
  const legacy = layout === "legacy";
  return (
    <svg aria-hidden="true" viewBox="0 0 240 158" className="block w-full rounded-lg border border-border bg-canvas">
      <rect x="49" y="10" width="142" height="140" fill="#dad5ce" />
      <rect x="46" y="7" width="142" height="140" fill="white" stroke="#ded6cc" />
      {legacy && <rect x="55" y="16" width="124" height="8" rx="1" fill={primaryColor} stroke={accentColor} strokeWidth=".5" />}
      {studio && <rect x="55" y="16" width="124" height="42" fill={primaryColor} />}
      {ledger && <path d="M55 17h124" stroke={accentColor} strokeWidth="2" />}
      <rect x={studio || horizon ? 61 : 142} y={legacy ? 30 : 23} width="30" height={ledger ? 4 : 6} rx="1" fill={accentColor} />
      <rect x={horizon ? 141 : 61} y={studio ? 45 : 36} width="32" height="3" rx="1" fill="#8c929a" />
      {horizon && <path d="M55 49h124" stroke={accentColor} strokeWidth="2" />}
      <path d={studio ? "M61 64h33m-33 6h20" : "M61 57h33m-33 6h20"} stroke="#8c929a" strokeWidth="2" />
      <path d="M151 61h21m-21 6h16" stroke="#8c929a" strokeWidth="2" />
      <rect x="55" y="77" width="124" height="10" fill={ledger ? "white" : legacy ? "#eeeae4" : primaryColor} stroke={ledger ? accentColor : "none"} strokeWidth=".6" />
      <path d="M59 82h35m43 0h9m15 0h13" stroke={accentColor} strokeWidth="2" />
      <path d="M55 96h124m-124 10h124m-124 10h124" stroke="#ded6cc" />
      <path d="M59 92h52m-52 10h43m-43 10h51m49-20h14m-14 10h14m-14 10h14" stroke="#8c929a" strokeWidth="2" />
      <rect x={horizon ? 55 : 119} y="124" width={horizon ? 124 : 60} height="15" fill={ledger ? "white" : legacy ? "#eeeae4" : primaryColor} stroke={ledger ? accentColor : "none"} />
      {horizon && <path d="M55 124v15" stroke={accentColor} strokeWidth="3" />}
      <path d="M146 132h25" stroke={accentColor} strokeWidth="3" />
    </svg>
  );
}
