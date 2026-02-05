"use client";

import style from './TopButton.module.css';

export default function TopButton(props: { smooth?: boolean; offset?: number; }) {
	const handleClick = () => {
		const yOffset = props.offset ?? -80;
		const element = document.body;
		const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
		window.scrollTo({ top: y, behavior: props.smooth ? 'smooth' : 'auto' });
	}
	
	return (
		<button onClick={handleClick} id="top-button" title="トップに戻る" className={style.topButton}>▲</button>
	);
}