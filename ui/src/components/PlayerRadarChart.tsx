import React, { useId, useMemo } from "react";

export type StatKey =
	| "kick"
	| "control"
	| "technique"
	| "pressure"
	| "physical"
	| "agility"
	| "intelligence";

export type RadarStats = Record<StatKey, number>;

export type LabelSpec = {
	text: string;
	iconUrl?: string; // 外周アイコン
};

type Props = {
	values: RadarStats;
	minValues: RadarStats;
	maxValues: RadarStats;

	order?: StatKey[];

	size?: number;
	rings?: number;

	labels?: Partial<Record<StatKey, LabelSpec>>;

	/** チャート外側の「ラベル・アイコン用」余白（viewBoxを広げる） */
	outerMargin?: number;

	/** チャート本体の余白（半径に効く） */
	padding?: number;

	labelOffset?: number;
	valueFontSize?: number;
	labelFontSize?: number;
	blockGap?: number;

	showValueOnLabel?: boolean;
	valueFormatter?: (key: StatKey, value: number, min: number, max: number) => string;

	iconSize?: number;
	iconOffset?: number;
	iconTangent?: boolean;
	iconUpright?: boolean;

	iconOpacity?: number;
	iconColorMode?: "auto" | "light" | "dark";

	className?: string;
	style?: React.CSSProperties;
};

const DEFAULT_ORDER: StatKey[] = [
	"kick",
	"control",
	"pressure",
	"physical",
	"agility",
	"intelligence",
	"technique",
];

const DEFAULT_LABELS: Record<StatKey, LabelSpec> = {
	kick: { text: "キック" },
	control: { text: "コントロール" },
	technique: { text: "テクニック" },
	pressure: { text: "プレッシャー" },
	physical: { text: "フィジカル" },
	agility: { text: "アジリティ" },
	intelligence: { text: "インテリジェンス" },
};

function clamp01(x: number) {
	if (!Number.isFinite(x)) return 0;
	if (x < 0) return 0;
	if (x > 1) return 1;
	return x;
}

function normalizeToFirstRing(v: number, min: number, max: number, rings: number) {
	const safeRings = Math.max(1, Math.floor(rings));
	const base = 1 / safeRings;

	if (!Number.isFinite(v) || !Number.isFinite(min) || !Number.isFinite(max)) return base;

	const d = max - min;
	if (d <= 0) return base;

	const raw = (v - min) / d;
	const t = base + raw * (1 - base);
	return clamp01(t);
}

function pointsToString(pts: Array<{ x: number; y: number }>) {
	return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}



export function RadarChart7(props: Props) {
	const {
		values,
		minValues,
		maxValues,

		order = DEFAULT_ORDER,

		size = 280,
		rings = 5,

		labels,

		outerMargin = 80, // ←ここが安定の肝。日本語長めなら60〜80でもOK
		padding = 26,

		labelOffset = 14,
		labelFontSize = 11,
		valueFontSize = labelFontSize + 24,
		blockGap = 4,

		valueFormatter = (_k, v) => String(Math.round(v)),

		iconSize = 36,
		iconOffset = -24,
		iconTangent = true,
		iconUpright = false,

		iconOpacity = 0.3,
		iconColorMode = "auto",

		className,
		style,
	} = props;

	function getBlockPlacement(angle: number, lx: number, ly: number) {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		const H = valueFontSize + blockGap + labelFontSize;

		// 横の揃え
		const anchor =
			Math.abs(cos) < 0.25 ? "middle" : cos > 0 ? "start" : "end";

		// 縦の基準位置（アンカー点に対してブロック全体を動かす）
		// yTop を決めて、そこから value と label を積む
		let yTop = ly - H / 2; // 基本は中央
		if (sin < -0.25) {
			// 上側：アンカーをブロックの下寄りにしたい → 上に持ち上げ
			yTop = ly - H;
		} else if (sin > 0.25) {
			// 下側：アンカーをブロックの上寄りにしたい → 下げ
			yTop = ly;
		}

		return { anchor, yTop };
	}

	const uid = useId();

	const safeOrder = useMemo(() => {
		const unique = Array.from(new Set(order));
		return unique.length === 7 ? unique : DEFAULT_ORDER;
	}, [order]);

	const mergedLabels = (k: StatKey) => labels?.[k] ?? DEFAULT_LABELS[k];

	const geom = useMemo(() => {
		const n = safeOrder.length;

		// 注意：中心座標は「元のsize基準」のまま固定
		const cx = size / 2;
		const cy = size / 2;
		const r = Math.max(0, size / 2 - padding);

		const startAngle = -Math.PI / 2;

		const axes = safeOrder.map((key, i) => {
			const angle = startAngle + (2 * Math.PI * i) / n;

			const ox = cx + r * Math.cos(angle);
			const oy = cy + r * Math.sin(angle);

			const lx = cx + (r + labelOffset) * Math.cos(angle);
			const ly = cy + (r + labelOffset) * Math.sin(angle);

			const ix = cx + (r + iconOffset) * Math.cos(angle);
			const iy = cy + (r + iconOffset) * Math.sin(angle);

			return { key, angle, ox, oy, lx, ly, ix, iy };
		});

		const polygonPoints = axes.map((a) => {
			const v = values[a.key];
			const mn = minValues[a.key];
			const mx = maxValues[a.key];
			const t = normalizeToFirstRing(v, mn, mx, rings);

			return {
				x: cx + r * t * Math.cos(a.angle),
				y: cy + r * t * Math.sin(a.angle),
			};
		});

		const ringPolygons = Array.from({ length: Math.max(1, rings) }, (_, idx) => {
			const t = (idx + 1) / Math.max(1, rings);
			return axes.map((a) => ({
				x: cx + r * t * Math.cos(a.angle),
				y: cy + r * t * Math.sin(a.angle),
			}));
		});

		return { cx, cy, r, axes, polygonPoints, ringPolygons };
	}, [safeOrder, size, padding, rings, values, minValues, maxValues, labelOffset, iconOffset]);

	// viewBoxを外側に広げる（ここが発振しない）
	const vb = useMemo(() => {
		const m = Math.max(0, outerMargin);
		return `${-m} ${-m} ${size + m * 2} ${size + m * 2}`;
	}, [size, outerMargin]);

	return (
		<svg
			width={size}
			height={size}
			viewBox={vb}
			className={className}
			style={style}
			role="img"
			aria-label="Radar chart"
		>
			<defs>
				<linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
					<stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
				</linearGradient>
			</defs>

			{/* 目盛りリング */}
			<g stroke="currentColor" strokeOpacity="0.16" fill="none">
				{geom.ringPolygons.map((pts, i) => (
					<polygon key={i} points={pointsToString(pts)} />
				))}
			</g>

			{/* 軸 */}
			<g stroke="currentColor" strokeOpacity="0.18">
				{geom.axes.map((a) => (
					<line key={a.key} x1={geom.cx} y1={geom.cy} x2={a.ox} y2={a.oy} />
				))}
			</g>

			{/* 値の多角形 */}
			<polygon
				points={pointsToString(geom.polygonPoints)}
				fill={`url(#${uid}-fill)`}
				stroke="currentColor"
				strokeOpacity={0.85}
				strokeWidth={2}
			/>

			{/* 頂点 */}
			<g fill="currentColor">
				{geom.polygonPoints.map((p, i) => (
					<circle key={safeOrder[i]} cx={p.x} cy={p.y} r={3} opacity={0.9} />
				))}
			</g>

			{/* 外周アイコン */}
			<g opacity={0.95}>
				{geom.axes.map((a) => {
					const spec = mergedLabels(a.key);
					if (!spec.iconUrl) return null;

					const px = a.ix;
					const py = a.iy;

					const x = px - iconSize / 2;
					const y = py - iconSize / 2;

					let deg = (a.angle * 180) / Math.PI + 90;
					if (iconUpright) {
						const norm = ((deg % 360) + 360) % 360;
						if (norm > 90 && norm < 270) deg += 180;
					}

					const transform = iconTangent ? `rotate(0 ${px} ${py})` : undefined;

					return (
						<image
							key={a.key}
							href={spec.iconUrl}
							x={x}
							y={y}
							width={iconSize}
							height={iconSize}
							preserveAspectRatio="xMidYMid meet"
							transform={transform}
							opacity={iconOpacity}
							style={{
								filter:
									iconColorMode === "dark"
										? "none"
										: iconColorMode === "light"
										? "invert(1)"
										: "var(--radar-icon-filter)",
							}}
						/>
					);
				})}
			</g>

			{/* 文字ラベル（値+日本語） */}
			<g
				fill="currentColor"
				opacity={0.92}
				style={{ userSelect: "none", fontVariantNumeric: "tabular-nums" }}
			>
				{geom.axes.map((a) => {
					const spec = mergedLabels(a.key);

					const { anchor, yTop } = getBlockPlacement(a.angle, a.lx, a.ly);

					const v = values[a.key];
					const mn = minValues[a.key];
					const mx = maxValues[a.key];

					const valueText = valueFormatter(a.key, v, mn, mx);

					// value は上、label は下（ブロック内の相対配置）
					const yValue = yTop + valueFontSize; // textはベースラインなのでこう置くと安定
					const yLabel = yTop + valueFontSize + blockGap + labelFontSize;

					return (
						<g key={a.key}>
							<text
								x={a.lx}
								y={yValue}
								textAnchor={anchor as "start" | "middle" | "end"}
								fontSize={valueFontSize}
								fontWeight={800}
								opacity={0.95}
							>
								{valueText}
							</text>

							<text
								x={a.lx}
								y={yLabel}
								textAnchor={anchor as "start" | "middle" | "end"}
								fontSize={labelFontSize}
								opacity={0.9}
							>
								{spec.text}
							</text>
						</g>
					);
				})}
			</g>
		</svg>
	);
}
