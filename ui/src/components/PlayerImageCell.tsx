import { useRef, useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import style from "./PlayersList.module.css";

export default function PlayerImageCell(props: { imgUrl: string; name: string }) {
	const [showZoomedImage, setShowZoomedImage] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const anchorRef = useRef<HTMLDivElement | null>(null);
	const [rect, setRect] = useState<DOMRect | null>(null);

	const handleEnter = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		timeoutRef.current = setTimeout(() => {
			const el = anchorRef.current;
			if (!el) return;
			setRect(el.getBoundingClientRect());
			setShowZoomedImage(true);
		}, 300);
	};

	const handleLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		timeoutRef.current = setTimeout(() => {
			setShowZoomedImage(false);
		}, 100);
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	useEffect(() => {
		if (!showZoomedImage) return;

		const update = () => {
			const el = anchorRef.current;
			if (!el) return;
			setRect(el.getBoundingClientRect());
		};

		update();
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);

		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [showZoomedImage]);

	const portal = useMemo(() => {
		if (typeof window === "undefined") return null;
		return document.body;
	}, []);

	return (
		<>
			<div className={style.playerImage} ref={anchorRef}>
				<Image
					src={props.imgUrl}
					alt={props.name}
					width={60}
					height={60}
					onMouseEnter={handleEnter}
					onMouseLeave={handleLeave}
				/>
			</div>

			{showZoomedImage && rect && portal
				? createPortal(
						<div
							className={style.zoomInImage}
							style={{
								position: "fixed",
								zIndex: 100000,
								left: rect.left + rect.width / 2,
								top: rect.top,
								transform: "translate(-50%, calc(-100% - 8px))"
							}}
							onMouseEnter={handleEnter}
							onMouseLeave={handleLeave}
						>
							<Image src={props.imgUrl} alt={props.name} width={160} height={160} />
						</div>,
						portal
					)
				: null}
		</>
	);
};