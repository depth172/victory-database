import Image from "next/image";

export default function PlayerCategoryIcon(props: { category: string; size?: number; style?: React.CSSProperties }) {
	const size = props.size ?? 24;

	const japaneseToEnglish: { [key: string]: string } = {
		"監督": "leader",
		"コーチ": "leader",
		"マネージャー": "manager",
	};

	const categoryKey = japaneseToEnglish[props.category] ?? props.category;

	switch (categoryKey) {
		case "leader":
			return <Image src="/img/icons/category/leader.webp" alt="監督" width={size * 1.3} height={size} style={props.style} />;
		case "manager":
			return <Image src="/img/icons/category/manager.webp" alt="マネージャー" width={size * 1.1} height={size} style={props.style} />;
		default:
			return <></>;
	}
}