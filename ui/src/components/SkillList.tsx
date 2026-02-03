import { Skill, SkillEffect } from "@/types";
import style from "./SkillList.module.css";
import SkillCategoryIcon from "./icons/SkillCategoryIcon";
import ElementIcon from "./icons/ElementIcon";
import Image from "next/image";
import SkillEffectIcon from "./icons/SkillEffectIcon";
import Link from "next/link";

type Props = {
	initialItems: Skill[];
};

const effectDict: Record<SkillEffect, string> = {
	"counter_shoot": "カウンターシュート",
	"long_shoot": "ロングシュート",
	"shoot_block": "シュートブロック",
	"punching": "パンチング",
}

export default function SkillList({ initialItems }: Props) {
	return (
		<ul className={style.list}>
			{initialItems.map((skill) => (
				<li key={skill.id}>
					<Link href={`/skill/${skill.id}`} className={style.listItem}>
						<div className={`
							${style.skillHeader} 
							${skill.element === "風" ? style.wind :
								skill.element === "林" ? style.forest :
								skill.element === "火" ? style.fire :
								skill.element === "山" ? style.mountain :
								skill.element === "無" ? style.none : ""
							}
						`}>
							<div className={style.skillTitle}>
								<SkillCategoryIcon category={skill.category} />
								<ElementIcon element={skill.element} />
								<div className={style.skillName}>
									{skill.name}
								</div>
							</div>
							{skill.effect && (
								<div className={style.skillEffect}>
									{effectDict[skill.effect]}
									<SkillEffectIcon effect={skill.effect ?? ""} size={24} />
								</div>
							)}
						</div>
						<div className={style.skillDetails}>
							<div className={style.imageSection}>
								{skill.thumbnail && (
									<Image src={skill.thumbnail} alt={skill.name} width={229 * 0.8} height={129 * 0.8} />
								)}
							</div>
							<div className={style.textSection}>
								<div className={style.skillDescription}>
									{skill.description}
								</div>
								<div className={style.skillStats}>
									<div className={`${style.skillStat} ${style.tensionCost}`}>
										<div>消費テンション</div>
										<div className={style.numberCell}>
											<span className={style.number}>{skill.tension_cost}</span>
											<span>T</span>
										</div>
									</div>
									<div className={`${style.skillStat} ${style.power}`}>
										<div>威力</div>
										<div className={style.numberCell}>
											<span className={style.number}>{skill.power}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</Link>
				</li>
			))}
		</ul>
	);
}