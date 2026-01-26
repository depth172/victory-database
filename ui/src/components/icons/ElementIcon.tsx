import Image from "next/image";

export default function ElementIcon(props: { element: string; size?: number }) {
	const size = props.size ?? 24;

	const japaneseToEnglish: { [key: string]: string } = {
		"火": "fire",
		"風": "wind",
		"林": "forest",
		"山": "mountain",
		"無": "none",
	};

	const elementKey = japaneseToEnglish[props.element] ?? props.element;

	switch (elementKey) {
		case "fire":
			return <Image src="/img/icons/elements/fire.webp" alt="火属性" width={size} height={size} />;
		case "wind":
			return <Image src="/img/icons/elements/wind.webp" alt="風属性" width={size} height={size} />;
		case "forest":
			return <Image src="/img/icons/elements/forest.webp" alt="林属性" width={size} height={size} />;
		case "mountain":
			return <Image src="/img/icons/elements/mountain.webp" alt="山属性" width={size} height={size} />;
		case "none":
			return <></>
		default:
			return <span style={{ display: "inline-block", width: size, height: size }} />;
	}
}