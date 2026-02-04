import Link from "next/link";
import ElementIcon from "./icons/ElementIcon";
import SkillCategoryIcon from "./icons/SkillCategoryIcon";
import SkillEffectIcon from "./icons/SkillEffectIcon";
import style from "./PlayerSkillList.module.css";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SkillRow = {
  player_number: number;
  slot: number;
  unlock_level: number;
  skill_id: string;
  name: string;
	kind: string;
  category: string;
	element: string;
	effect: string | null;
	power: number | null;
  tension_cost: number | null;
};

type SlotItem =
  | { slot: number; unlock_level: number; skill: SkillRow }
  | { slot: number; unlock_level: number; skill: null };

const SLOTS = 6;

export default async function PlayerSkillList({ playerNumber }: { playerNumber: number }) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
		.schema("extended")
    .from("player_default_skills_expanded")
    .select("player_number,slot,unlock_level,skill_id,name,kind,category,element,effect,power,tension_cost")
    .eq("player_number", playerNumber)
    .order("slot", { ascending: true });

  if (error) {
		console.error("PlayerSkillList: failed to load skills", error);
		return <div style={{ padding: 16 }}>スキルの読み込みに失敗しました: {error.message}</div>;
	}

  const bySlot = new Map<number, SkillRow>();
  for (const row of data ?? []) bySlot.set(row.slot, row);

  // 1～6を生成し、無い枠は skill:null
  const items: SlotItem[] = Array.from({ length: SLOTS }, (_, i) => {
    const slot = i + 1;
    const row = bySlot.get(slot) ?? null;

    const unlock_level = row?.unlock_level ?? 0;

    return row
      ? { slot, unlock_level, skill: row }
      : { slot, unlock_level, skill: null };
  });

  return (
    <ul className={style.skillList}>
      {items.map((it) => (
        <li
          key={it.slot}
					className={!it.skill ? style.skillItemEmpty : ""}
        >
          {it.skill ? (
            <Link
							href={it.skill.kind === "special_move" ? `/skill/${encodeURIComponent(it.skill.skill_id)}` : "#"}
							className={
								`${style.skillItem}
								${
									it.skill?.element === "風" ? style.wind :
									it.skill?.element === "林" ? style.forest :
									it.skill?.element === "火" ? style.fire :
									it.skill?.element === "山" ? style.mountain :
									it.skill?.element === "無" ? style.none : ""
								}
								${
									it.skill?.kind === "real_skill" ? style.realSkill : ""
								}
								`
							}
						>
              <div className={style.skillName}>
								<SkillCategoryIcon category={it.skill.category} size={24} />
								<ElementIcon element={it.skill.element} size={20} />
								{it.skill.name}
							</div>
							<div className={style.skillDetails}>
								<SkillEffectIcon effect={it.skill.effect ?? ""} size={20} />
								{it.skill.tension_cost !== null && 
									<div className={`${style.skillInfo} ${style.tensionCost}`}>
										<div className={style.numberCell}>
											<span className={style.number}>{it.skill.tension_cost}</span>
											<span>T</span>
										</div>
									</div>
								}
								{it.skill.power !== null && 
									<div className={`${style.skillInfo} ${style.power}`}>
										<div>威力</div>
										<div className={style.numberCell}>
											<span className={style.number}>{it.skill.power}</span>
										</div>
									</div>
								}
							</div>
            </Link>
          ) : (
            <div className={style.skillEmpty} />
          )}
        </li>
      ))}
    </ul>
  );
}
