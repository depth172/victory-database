import Image from "next/image";

export default function SkillCategoryIcon(props: { category: string; size?: number }) {
	const size = props.size ?? 24;

	const japaneseToEnglish: { [key: string]: string } = {
		"シュート": "shoot",
		"オフェンス": "offense",
		"ディフェンス": "defense",
		"キーパー": "keeper",
	};

	const categoryKey = japaneseToEnglish[props.category] ?? props.category;

	switch (categoryKey) {
		case "shoot":
			return <Image src="/img/icons/skills/shoot.webp" alt="シュート" width={size} height={size} />;
		case "offense":
			return <Image src="/img/icons/skills/offense.webp" alt="オフェンス" width={size} height={size} />;
		case "defense":
			return <Image src="/img/icons/skills/defense.webp" alt="ディフェンス" width={size} height={size} />;
		case "keeper":
			return <Image src="/img/icons/skills/keeper.webp" alt="キーパー" width={size} height={size} />;
		case "keshin":
			return <Image src="/img/icons/super_skills/keshin.webp" alt="化身" width={size} height={size} />;
		case "mixi_trans":
			return <Image src="/img/icons/super_skills/mixi_trans.webp" alt="ミキシトランス" width={size} height={size} />;
		case "soul":
			return <Image src="/img/icons/super_skills/soul.webp" alt="ソウル" width={size} height={size} />;
		case "awakening_power":
			return <Image src="/img/icons/super_skills/awakening_power.webp" alt="覚醒パワー" width={size} height={size} />;
		case "kizuna_trans":
			return <Image src="/img/icons/super_skills/kizuna_trans.webp" alt="キズナトランス" width={size} height={size} />;
		case "mode_change":
			return <Image src="/img/icons/super_skills/mode_change.webp" alt="モードチェンジ" width={size} height={size} />;
		default:
			return <span style={{ display: "inline-block", width: size, height: size }} />;
	}
}