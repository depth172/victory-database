import Image from "next/image";

export default function PositionIcon(props: { position: string; size?: number; style?: React.CSSProperties }) {
	const size = props.size ?? 24;

	switch (props.position) {
		case "GK":
			return <Image src="/img/icons/position/gk.webp" alt="ゴールキーパー" width={size * 1.6} height={size} style={props.style} />;
		case "DF":
			return <Image src="/img/icons/position/df.webp" alt="ディフェンダー" width={size * 1.65} height={size} style={props.style} />;
		case "MF":
			return <Image src="/img/icons/position/mf.webp" alt="ミッドフィールダー" width={size * 1.75} height={size} style={props.style} />;
		case "FW":
			return <Image src="/img/icons/position/fw.webp" alt="フォワード" width={size * 2} height={size} style={props.style} />;
		default:
			return <span style={{ display: "inline-block", width: size * 1.7, height: size }} />;
	}
}