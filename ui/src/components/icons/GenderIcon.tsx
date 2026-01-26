import Image from "next/image";

export default function GenderIcon(props: { gender: string; size?: number }) {
	const size = props.size ?? 24;

	const japaneseToEnglish: { [key: string]: string } = {
		"男": "male",
		"女": "female",
		"その他": "other",
	};

	const genderKey = japaneseToEnglish[props.gender] ?? props.gender;

	switch (genderKey) {
		case "male":
			return <Image src="/img/icons/gender/male.webp" alt="男性" width={size} height={size} />;
		case "female":
			return <Image src="/img/icons/gender/female.webp" alt="女性" width={size} height={size} />;
		default:
			return <span style={{ display: "inline-block", width: size, height: size }} />;
	}
}