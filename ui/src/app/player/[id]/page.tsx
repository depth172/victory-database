import ElementIcon from "@/components/icons/ElementIcon";
import style from "./Page.module.css";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExtendedPlayer } from "@/types";
import Image from "next/image";
import { notFound } from "next/navigation";
import PositionIcon from "@/components/icons/PositionIcon";
import GenderIcon from "@/components/icons/GenderIcon";
import PlayerCategoryIcon from "@/components/icons/PlayerCategoryIcon";
import { RadarChart7 } from "@/components/PlayerRadarChart";
import Link from "next/link";
import PlayerSkillList from "@/components/PlayerSkillList";
import BuildIcon from "@/components/icons/BuildIcon";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	const supabase = createSupabaseServerClient();

	const { data, error } = await supabase
		.schema("extended")
		.from("players_view")
		.select("name,category")
		.eq("number", id)
		.maybeSingle();

	if (error || !data) {
		return {
			title: "選手情報 - Victory Database",
			description: "Victory Databaseの選手情報ページです。",
		};
	}
	return {
		title: `${data.name} | 選手情報 - Victory Database`,
		description: `${data.category[0]}「${data.name}」の情報ページです。`,
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
    .from("players_view")
    .select(
      [
        "number",
        "name",
        "ruby",
        "nickname",
        "appeared_works",
        "description",
        "get_methods",
        "img_url",
        "view_url",
        "position",
        "element",
        "kick",
        "control",
        "technique",
        "pressure",
        "physical",
        "agility",
        "intelligence",
        "age_group",
        "grade",
        "gender",
        "category",
        "affiliation",
				"main_build_id"
      ].join(",")
    )
    .eq("number", id)
    .maybeSingle();

  if (error || !data) {
    // 本番はログに回して notFound に寄せてもいい
    if (error) {
      return <div style={{ padding: 16 }}>読み込み失敗: {error.message}</div>;
    }
		console.log(`PlayerPage: player not found, number=${id}`);
    notFound();
  }

	const { data: minmaxData, error: maxError } = await supabase
		.schema("inagle")
		.from("player_stat_minmax")
		.select("*")
		.single();

	if (maxError || !minmaxData) {
		if (maxError) {
			return <div style={{ padding: 16 }}>最大値の読み込み失敗: {maxError.message}</div>;
		}
		console.log(`PlayerPage: player stat max not found`);
		notFound();
	}

	const { data: buildData } = await supabase
		.schema("extended")
		.from("builds")
		.select("*")
		.eq("id", (data as unknown as ExtendedPlayer).main_build_id)
		.maybeSingle();

  const p = data as unknown as ExtendedPlayer;
	const b = buildData as { id: string; name: string; description: string };

	const maxStats = {
		kick: minmaxData.kick_max,
		control: minmaxData.control_max,
		technique: minmaxData.technique_max,
		pressure: minmaxData.pressure_max,
		physical: minmaxData.physical_max,
		agility: minmaxData.agility_max,
		intelligence: minmaxData.intelligence_max
	};

	const minStats = {
		kick: minmaxData.kick_min,
		control: minmaxData.control_min,
		technique: minmaxData.technique_min,
		pressure: minmaxData.pressure_min,
		physical: minmaxData.physical_min,
		agility: minmaxData.agility_min,
		intelligence: minmaxData.intelligence_min
	}
	
	const isNotPlayer = !p.category?.includes("選手");
	const categoryWithoutPlayer = p.category?.filter(c => c !== "選手")[0] ?? "";

  return (
		<div className={style.wrapper}>
			<main className={style.pageContainer}>
				<header className={style.header}>
					<div className={style.iconBlock}>
						<Image
							src={p.img_url}
							alt={p.name}
							width={128}
							height={128}
						/>
						<div className={style.namePlate}>
							<ElementIcon element={p.element ?? ""} size={24} />
							<div className={style.name}>{p.nickname}</div>
						</div>
					</div>
					<div className={style.nameBlock}>
						<div className={style.playerName}>
							<h1 className={style.nameMain}>{p.name}</h1>
							<div className={style.nameRuby}>{p.ruby}</div>
						</div>
						<div className={style.baseInfoBlock}>
							<GenderIcon gender={p.gender} size={24} />
							<PlayerCategoryIcon category={categoryWithoutPlayer} size={24} />
							<PositionIcon position={p.position ?? ""} size={24} style={isNotPlayer ? { opacity: 0.5 } : {}} />
							<div className={style.playerNumber}>
								No. {p.number ?? " - "}
							</div>
						</div>
					</div>
					<div className={style.descriptionBlock}>
						{p.description}
					</div>
				</header>

				<section className={style.statsGrid}>
					<h2>ステータス (Lv50時)</h2>
					<RadarChart7
						values={
							{
								kick: p.kick ?? 0,
								control: p.control ?? 0,
								technique: p.technique ?? 0,
								pressure: p.pressure ?? 0,
								physical: p.physical ?? 0,
								agility: p.agility ?? 0,
								intelligence: p.intelligence ?? 0
							}
						}
						labels={
							{
								kick: { text: "キック", iconUrl: "/img/icons/stats/kick.webp" },
								control: { text: "コントロール", iconUrl: "/img/icons/stats/control.webp" },
								technique: { text: "テクニック", iconUrl: "/img/icons/stats/technique.webp" },
								pressure: { text: "プレッシャー", iconUrl: "/img/icons/stats/pressure.webp" },
								physical: { text: "フィジカル", iconUrl: "/img/icons/stats/physical.webp" },
								agility: { text: "アジリティ", iconUrl: "/img/icons/stats/agility.webp" },
								intelligence: { text: "インテリジェンス", iconUrl: "/img/icons/stats/intelligence.webp" }
							}
						}
						maxValues={maxStats}
						minValues={minStats}
						size={280}
						rings={5}
					/>

					<h2>習得スキル</h2>
					<PlayerSkillList playerId={p.number} />
				</section>

				<section className={style.abilityGrid}>
					<div className={style.buildBlock}>
						<h2>メインビルド</h2>
						<div className={style.buildInfo}>
							<div className={style.buildHeader}>
								<BuildIcon build={b ? b.id : ""} size={48} />
								<h3>{b ? b.name : "調査中"}</h3>
							</div>
							<p className={style.buildDescription}>{b ? b.description : ""}</p>
							<p className={style.buildNote}>
								メインビルドはスピリット開封時に最も高い確率 (70%) で付与されるビルドです。
							</p>
						</div>
					</div>

					<div className={style.passiveBlock}>
						<h2>パッシブスキル</h2>
						<div>
							<p>パッシブスキル情報は現在準備中です。</p>
						</div>
					</div>
				</section>

				<section className={style.getMethodGrid}>
					<h2>入手方法</h2>
					<div>
						{p.get_methods && p.get_methods.length > 0 ? (
							<ul>
								{p.get_methods.map((method, index) => (
									<li key={index}>{method.title}</li>
								))}
							</ul>
						) : 
							<div>情報なし</div>
						}
					</div>
				</section>

				<section className={style.infoGrid}>
					<div className={style.affiliationBlock}>
						<h2>所属チーム</h2>
						<ul>
							{p.affiliation.map((aff) => (
								<li key={aff}>{aff}</li>
							))}
						</ul>
					</div>
					<div className={style.miscInfoBlock}>
						<div className={style.largeCell}>
							<h2>初登場</h2>
							<div>{p.appeared_works}</div>
						</div>
						<div className={style.cell}>
							<h2>年代区分</h2>
							<div>{p.age_group}</div>
						</div>
						<div className={style.cell}>
							<h2>学年</h2>
							<div>{p.grade}</div>
						</div>
					</div>
				</section>

				<section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
					<Link href="/player/list">一覧に戻る</Link>
					{p.view_url ? (
						<a href={p.view_url} target="_blank" rel="noreferrer">
							3Dモデルを確認する
						</a>
					) : null}
				</section>
			</main>
		</div>
  );
}
