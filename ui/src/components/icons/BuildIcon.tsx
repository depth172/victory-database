import Image from "next/image";

export default function BuildIcon(props: { build: string; size?: number }) {
	const size = props.size ?? 24;

	const japaneseToEnglish: { [key: string]: string } = {
		"正義": "justice",
		"テンション": "tension",
		"カウンター": "counter",
		"キズナ": "bond",
		"ラフプレー": "rough_play",
		"ひっさつ": "breach"
	};

	const buildKey = japaneseToEnglish[props.build] ?? props.build;

	switch (buildKey) {
		case "justice":
			return <Image src="/img/icons/builds/justice.webp" alt="正義" className="mono-icon" width={size} height={size} />;
		case "tension":
			return <Image src="/img/icons/builds/tension.webp" alt="テンション" className="mono-icon" width={size} height={size} />;
		case "counter":
			return <Image src="/img/icons/builds/counter.webp" alt="カウンター" className="mono-icon" width={size} height={size} />;
		case "bond":
			return <Image src="/img/icons/builds/bond.webp" alt="キズナ" className="mono-icon" width={size} height={size} />;
		case "rough_play":
			return <Image src="/img/icons/builds/rough_play.webp" alt="ラフプレー" className="mono-icon" width={size} height={size} />;
		case "breach":
			return <Image src="/img/icons/builds/breach.webp" alt="ひっさつ" className="mono-icon" width={size} height={size} />;
		default:
			return <span style={{ display: "inline-block", width: size, height: size }} />;
	}
}