/** 연쇄 2번째부터 "콤보 ×N!" 표시. key가 바뀔 때마다 애니메이션이 다시 재생된다. */
export default function ComboBanner({ combo }) {
  if (!combo) return null;
  return <div key={combo.id} className="combo show">콤보 ×{combo.n}!</div>;
}
