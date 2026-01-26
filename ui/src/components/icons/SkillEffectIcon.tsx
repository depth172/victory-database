import Image from "next/image";

export default function SkillEffectIcon(props: { effect: string; size?: number }) {
	const size = props.size ?? 24;

	switch (props.effect) {
		case "long_shoot":
			return <Image src="/img/icons/skills/long_shoot.webp" alt="ロングシュート" width={size} height={size} />;
		case "counter_shoot":
			return <Image src="/img/icons/skills/counter_shoot.webp" alt="カウンターシュート" width={size} height={size} />;
		case "shoot_block":
			return <Image src="/img/icons/skills/shoot_block.webp" alt="シュートブロック" width={size} height={size} />;
		default:
			return <span style={{ display: "inline-block", width: size, height: size }} />;
	}
}