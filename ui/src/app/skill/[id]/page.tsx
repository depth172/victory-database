import style from "./Page.module.css";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { SpecialMoveCategory } from "@shared/types";
import { Skill } from "@/types";
import SkillEffectIcon from "@/components/icons/SkillEffectIcon";
import SkillCategoryIcon from "@/components/icons/SkillCategoryIcon";
import ElementIcon from "@/components/icons/ElementIcon";
import Image from "next/image";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	const supabase = createSupabaseServerClient();

	const { data: dataRaw, error } = await supabase
		.schema("extended")
		.from("all_skills")
		.select("name,category")
		.eq("skill_id", id)
		.maybeSingle();

	if (error || !dataRaw) {
		return {
			title: "スキル情報 - Victory Database",
			description: "Victory Databaseのスキル情報ページです。",
		};
	}

	const data = dataRaw as { name: string; category: SpecialMoveCategory };

	const categoryName = {
		"shoot": "シュート技",
		"offense": "オフェンス技",
		"defense": "ディフェンス技",
		"keeper": "キーパー技"
	}

	return {
		title: `${data.name} | スキル情報 - Victory Database`,
		description: `${categoryName[data.category]}「${data.name}」の情報ページです。`,
	};
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
		.schema("extended")
    .from("all_skills")
    .select("*")
		.eq("id", id)
		.maybeSingle();

  if (error || !data) {
    // 本番はログに回して notFound に寄せてもいい
    if (error) {
      return <div style={{ padding: 16 }}>読み込み失敗: {error.message}</div>;
    }
		console.log(`PlayerPage: skill not found, skill_id=${id}`);
    notFound();
  }

	const s = data as Skill;

  return (
		<div className={style.wrapper}>
			<main className={style.pageContainer}>
				<header className={style.header}>
					<div className={style.titleBlock}>
						<SkillCategoryIcon category={s.category} size={48} />
						<ElementIcon element={s.element} size={40} />
						<h1 className={style.title}>{s.name}</h1>
					</div>
					<div className={style.imageBlock}>
					<Image src={s.thumbnail} alt={s.name} width={320} height={180} sizes="320px" priority />
					</div>
					<div className={style.descriptionBlock}>
						{s.alias && (
							<p className={style.aliasBlock}>別名:
								<span className={style.alias}>{s.alias}</span>
							</p>
						)}
						<p className={style.description}>{s.description}</p>
					</div>
					<div className={style.statsBlock}>
						<div className={style.statTension}>
							<div className={style.statLabel}>消費テンション</div>
							<div className={style.statValue}>
								<span className={style.number}>{s.tension_cost ?? "??"}</span>
								<span>T</span>
							</div>
						</div>
						<div className={style.statItem}>
							<div className={style.statLabel}>威力</div>
							<div className={style.statValue}>
								<span className={style.number}>{s.power ?? "??"}</span>
							</div>
						</div>
					</div>
				</header>
				
				<section className={style.abilityGrid}>
					{s.effect && (
						<div className={style.buildBlock}>
							<h2>特殊効果</h2>
							<div className={style.buildInfo}>
								<div className={style.buildHeader}>
									<SkillEffectIcon effect={s.effect} size={32} />
									<h3>
									{
										s.effect === "long_shoot" ? "ロングシュート" :
										s.effect === "counter_shoot" ? "カウンターシュート" :
										s.effect === "shoot_block" ? "シュートブロック" :
										s.effect === "punching" ? "パンチング" : ""
									}
									</h3>
								</div>
								<p className={style.buildDescription}>
									{s.effect === "long_shoot" && "この技では敵陣ゾーンエリア外、および攻撃フォーカスからシュートすることができる。\nロングシュートには共通のクールダウンがあり、ロングシュートを使用すると以降数十秒間は他のロングシュートを使用できない。"}
									{s.effect === "counter_shoot" && "敵のシュートの射線上にいた場合にも使用可能。\n敵のシュートATよりも自身のDF+技補正値が高い場合、テンションを2倍消費してそのシュートを敵ゴールに向けて蹴り返す。\n失敗した場合、蹴り返さずに等倍のテンションを消費してそのシュート自体の威力を減衰させる。"}
									{s.effect === "shoot_block" && "敵のシュートの射線上にいた場合にも使用可能。\n敵のシュートの威力をさらに減衰させる。"}
									{s.effect === "punching" && "ボールをキャッチせず、ランダムな方向に弾き返す。"}
								</p>
							</div>
						</div>
					)}
				</section>

				<section className={style.getMethodGrid}>
					<h2>入手方法</h2>
					<div>
						<p>入手方法情報は現在準備中です。</p>
					</div>
				</section>

				<section className={style.hasPlayerGrid}>
					<h2>このスキルを習得する選手</h2>
					<div>
						<p>習得選手の情報は現在準備中です。</p>
					</div>
				</section>

				<section className={style.hasVoiceGrid}>
					<h2>このスキルを使用時のボイスを持つ選手</h2>
					<div>
						<p>ボイス情報は現在準備中です。</p>
					</div>
				</section>

				<section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
					<Link href="/skill/list">一覧に戻る</Link>
				</section>
			</main>
		</div>
  );
}
