import Link from "next/link";
import style from "./Page.module.css";

export const metadata = {
	title: "Victory Database",
	description: "イナズマイレブンの非公式データベースサイト Victory Database へようこそ。",
};

export default function HomePage() {
	return (
		<div className={style.container}>
			<main className={style.main}>
				<h1 className={style.title}>Victory Database</h1>
				<p className={style.flavorText}>
					「いいでしょう？　これ！<br />
					　名付けて　Victory Database。<br />
					　<a href="https://zukan.inazuma.jp/">イナグル</a>にさらに独自情報を加えた<br />
					　超絶テスト版です！」<br />
				</p>
				<ul className={style.links}>
					<li>
						<Link href="/player/list">選手一覧</Link>
					</li>
					<li>
						<Link href="/skill/list">必殺技一覧</Link>
					</li>
				</ul>
			</main>
			<hr className={style.divider} />
			<footer className={style.footer}>
				<p>
					Victory Database made by <a href="https://twitter.com/depth172">depth</a><br />
					このサイトで使用しているデータの著作権は株式会社レベルファイブに帰属します。<br />
					This site is not affiliated with LEVEL-5 Inc.
				</p>
			</footer>
		</div>
	);
}