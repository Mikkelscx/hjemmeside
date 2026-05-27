// Visual Viewport API: match JS layout to the visible area (mobile Safari toolbar, pinch-zoom, etc.).
function mskViewportSize() {
	try {
		const vv = window.visualViewport;
		const w = vv && vv.width > 0 ? vv.width : window.innerWidth;
		const h = vv && vv.height > 0 ? vv.height : window.innerHeight;
		return { w, h };
	} catch {
		return { w: window.innerWidth, h: window.innerHeight };
	}
}

/** Projects “kort landscape” — samme logik som CSS (max-width 1024px, max-height 520px, bred>kort). Én kilde = mindre drift mellem browsere. */
const MSK_PROJECTS_LANDSCAPE_MAX_W = 1024;
const MSK_PROJECTS_LANDSCAPE_MAX_H = 520;
/** Skal matche `--projectsLandscapeFit` i kort mobil-landscape (styles.css). Bruges til layout-rx så ringen fylder bredden efter `scale()`. */
const MSK_PROJECTS_LANDSCAPE_FIT = 0.66;
/** iPad landskab: træk hele mindmap (hjernen + noder + streger) lidt op */
const MSK_PROJECTS_IPAD_LS_LAYOUT_UP_PX = 28;
/** iPad landskab: træk hele mindmap lidt mod venstre (mellem notesbog-marginerne) */
const MSK_PROJECTS_IPAD_LS_LAYOUT_LEFT_PX = 24;

/**
 * Ét stabilt mål for layout (afrundet heltal) — documentElement.client*, ikke visualViewport.
 * Bruges til mindmap-ellipse, breakpoint-lignende checks og --vh på projekter så design ikke “ånder” med Safari-UI.
 */
function mskProjectsLayoutViewportBox() {
	try {
		const de = document.documentElement;
		const w = Math.round(Math.max(1, de.clientWidth || window.innerWidth || 0));
		const h = Math.round(Math.max(1, de.clientHeight || window.innerHeight || 0));
		return { w, h };
	} catch {
		return {
			w: Math.round(Math.max(1, window.innerWidth || 0)),
			h: Math.round(Math.max(1, window.innerHeight || 0)),
		};
	}
}

/** Tillad browser-zoom (pinch / ctrl+scroll) — bruges hvor vi ellers blokerer touchmove/wheel mod scroll. */
function mskAllowBrowserZoomGesture(e) {
	try {
		if (!e) return false;
		if (e.type === 'touchstart' || e.type === 'touchmove') {
			if (e.touches && e.touches.length > 1) return true;
		}
		if (e.type === 'wheel' && (e.ctrlKey || e.metaKey)) return true;
	} catch (_) {}
	return false;
}

/** Side er zoomet ind — tillad pan/scroll i alle retninger. */
function mskIsBrowserPageZoomed() {
	try {
		const vv = window.visualViewport;
		if (vv) {
			if (typeof vv.scale === 'number' && vv.scale > 1.015) return true;
			const lw = document.documentElement.clientWidth || window.innerWidth || 0;
			const lh = document.documentElement.clientHeight || window.innerHeight || 0;
			if (vv.width > 0 && vv.height > 0 && (vv.width < lw - 2 || vv.height < lh - 2)) return true;
		}
	} catch (_) {}
	return false;
}

function mskSyncBrowserZoomPanMode() {
	try {
		document.documentElement.classList.toggle('msk-browser-zoom-active', mskIsBrowserPageZoomed());
	} catch (_) {}
}

/** Synlig viewport til mindmap (inner* + visualViewport) — vigtig i iPad DevTools landskab. */
function mskProjectsVisibleViewportPx() {
	try {
		if (
			document.body &&
			document.body.classList.contains('projects-page') &&
			mskIsProjectsTabletLandscapeViewport()
		) {
			const dim = mskProjectsTabletLandscapeLayoutPx();
			return { w: dim.w, h: dim.h };
		}
		const iw = Math.round(Math.max(1, window.innerWidth || 0));
		const ih = Math.round(Math.max(1, window.innerHeight || 0));
		if (
			document.body &&
			document.body.classList.contains('projects-page') &&
			(mskIsProjectsPhonePortraitViewport() ||
				document.documentElement.classList.contains('msk-projects-phone-portrait') ||
				mskIsProjectsTabletPortraitViewport() ||
				document.documentElement.classList.contains('msk-projects-ipad-portrait'))
		) {
			return { w: iw, h: ih };
		}
		const vv = window.visualViewport;
		if (vv && vv.width >= 200 && vv.height >= 200) {
			return {
				w: Math.round(Math.max(1, Math.min(iw, vv.width))),
				h: Math.round(Math.max(1, Math.min(ih, vv.height))),
			};
		}
		const lv = mskProjectsLayoutViewportBox();
		return {
			w: Math.round(Math.max(1, Math.min(iw, lv.w))),
			h: Math.round(Math.max(1, Math.min(ih, lv.h))),
		};
	} catch {
		return mskProjectsLayoutViewportBox();
	}
}

/**
 * Chrome DevTools (mobil-emulering): `visualViewport.height` kan fejlagtigt blive den **smalle** dimension (~414px),
 * så `--vh` sættes til bredden i stedet for højden → sider med `min-height: var(--vh)` kollapser og spacing ser “død” ud.
 * Falder tilbage til layout-viewport (documentElement.client*), samme stabile kilde som på projekter-siden.
 */
function mskSanitizedViewportSize() {
	try {
		const visual = mskViewportSize();
		const layout = mskProjectsLayoutViewportBox();
		let w = visual.w;
		let h = visual.h;
		const iw = Math.round(Math.max(1, window.innerWidth || 0));
		const ih = Math.round(Math.max(1, window.innerHeight || 0));

		/* Layout vs. visual: vv.height kan være den smalle kant */
		if (
			layout.w > 0 &&
			layout.h > 0 &&
			h > 0 &&
			w > 0 &&
			h <= layout.w + 2 &&
			layout.h > layout.w + 8
		) {
			w = layout.w;
			h = layout.h;
		}

		/*
		 * Chrome DevTools mobil-emulering: både visualViewport.height og documentElement.clientHeight
		 * kan være ~414 (bredden), mens window.innerHeight er korrekt (~896). Uden dette forbliver --vh = 414.
		 */
		if (ih > iw + 24 && h <= iw + 4 && ih > h + 32) {
			w = iw;
			h = ih;
		}
		return { w, h };
	} catch {
		return mskViewportSize();
	}
}

function mskIsProjectsShortLandscapeViewport() {
	try {
		/* Samme breakpoint som CSS (short landscape + --projectsLandscapeFit), så JS og styles matcher altid. */
		if (window.matchMedia) {
			const mqA = window.matchMedia(
				'(max-width: 1024px) and (max-height: 520px) and (orientation: landscape)'
			);
			const mqB = window.matchMedia(
				'(max-width: 1024px) and (max-height: 520px) and (min-aspect-ratio: 1/1)'
			);
			if ((mqA && mqA.matches) || (mqB && mqB.matches)) return true;
		}
		/* Fallback: inner* kort/lang (fx uden matchMedia) */
		let iw = Math.round(Math.max(1, window.innerWidth || 0));
		let ih = Math.round(Math.max(1, window.innerHeight || 0));
		if (iw < 2 || ih < 2) {
			const b = mskProjectsLayoutViewportBox();
			iw = Math.max(1, b.w);
			ih = Math.max(1, b.h);
		}
		const longSide = Math.max(iw, ih);
		const shortSide = Math.min(iw, ih);
		if (shortSide >= longSide) return false;
		/* Kun landskab — 375×667 portræt må ikke matche “kort landscape” */
		if (iw <= ih + 16) return false;
		if (longSide > MSK_PROJECTS_LANDSCAPE_MAX_W || shortSide > MSK_PROJECTS_LANDSCAPE_MAX_H) return false;
		return true;
	} catch (_) {
		return false;
	}
}

/**
 * Projekter: iPad / tablet portræt (641–1024px) — samme lodrette skitse-grid som mobil.
 * Skal matche CSS (burger + mindmap portrait-styling).
 */
function mskIsProjectsTabletPortraitViewport() {
	try {
		if (mskIsProjectsTabletLandscapeViewport()) return false;
		const iw = Math.round(Math.max(1, window.innerWidth || 0));
		const ih = Math.round(Math.max(1, window.innerHeight || 0));
		const longSide = Math.max(iw, ih);
		const shortSide = Math.min(iw, ih);
		const inTabletBand = longSide >= 1024 && longSide <= 1366 && shortSide >= 600;
		let portraitMq = ih > iw + 16;
		try {
			if (window.matchMedia) {
				portraitMq =
					!!(
						window.matchMedia('(orientation: portrait)').matches ||
						window.matchMedia('(max-aspect-ratio: 1/1)').matches
					) || (ih > iw + 16 && !window.matchMedia('(orientation: landscape)').matches);
			}
		} catch (_) {}
		if (inTabletBand && portraitMq) return true;
		if (!window.matchMedia) return false;
		const mqLegacyA = window.matchMedia(
			'(min-width: 641px) and (max-width: 1024px) and (orientation: portrait)'
		);
		const mqLegacyB = window.matchMedia(
			'(min-width: 641px) and (max-width: 1024px) and (max-aspect-ratio: 1/1)'
		);
		const mqWideTouchA = window.matchMedia(
			'(min-width: 641px) and (max-width: 1366px) and (orientation: portrait) and ((hover: none) or (pointer: coarse))'
		);
		const mqWideTouchB = window.matchMedia(
			'(min-width: 641px) and (max-width: 1366px) and (max-aspect-ratio: 1/1) and ((hover: none) or (pointer: coarse))'
		);
		return !!(
			(mqLegacyA && mqLegacyA.matches) ||
			(mqLegacyB && mqLegacyB.matches) ||
			(mqWideTouchA && mqWideTouchA.matches) ||
			(mqWideTouchB && mqWideTouchB.matches)
		);
	} catch (_) {
		return false;
	}
}

/** Låst iPad portræt mindmap — værdier i projects-ipad-portrait-lock.js */
function mskGetProjectsIpadPortraitLock() {
	try {
		return window.MSK_PROJECTS_IPAD_PORTRAIT_LOCK || null;
	} catch (_) {
		return null;
	}
}

function mskUseProjectsIpadPortraitLock() {
	try {
		if (!mskGetProjectsIpadPortraitLock()) return false;
		return !!(
			mskIsProjectsTabletPortraitViewport() ||
			document.documentElement.classList.contains('msk-projects-ipad-portrait')
		);
	} catch (_) {
		return false;
	}
}

function mskIpadPortraitLineLock(section) {
	const L = mskGetProjectsIpadPortraitLock();
	if (!L || !L.lines || !L.lines[section]) return null;
	if (mskUseProjectsIpadPortraitLock()) return L.lines[section];
	const phone = !!(
		mskIsProjectsPhonePortraitViewport() ||
		document.documentElement.classList.contains('msk-projects-phone-portrait')
	);
	if (phone && !mskIsProjectsTabletPortraitViewport()) return L.lines[section];
	return null;
}

/** Projekter: telefon portræt (≤640px) — samme 2+2 / hjernen / 2+2 grid som tablet portræt. */
function mskIsProjectsPhonePortraitViewport() {
	try {
		if (mskIsProjectsTabletLandscapeViewport()) return false;
		if (mskIsProjectsTabletPortraitViewport()) return false;
		if (mskIsProjectsShortLandscapeViewport()) return false;
		const iw = Math.round(Math.max(1, window.innerWidth || 0));
		const ih = Math.round(Math.max(1, window.innerHeight || 0));
		if (iw > 640) return false;
		try {
			if (
				window.matchMedia &&
				(window.matchMedia('(max-width: 640px) and (orientation: portrait)').matches ||
					window.matchMedia('(max-width: 640px) and (max-aspect-ratio: 1/1)').matches)
			) {
				return true;
			}
		} catch (_) {}
		return ih > iw + 8;
	} catch (_) {
		return false;
	}
}

/** Projekter: telefon landskab (kort viewport) — ellipse om hjernen, ikke portræt-grid. */
function mskIsProjectsPhoneLandscapeViewport() {
	try {
		if (mskIsProjectsTabletLandscapeViewport()) return false;
		return !!mskIsProjectsShortLandscapeViewport();
	} catch (_) {
		return false;
	}
}

/** Portræt-skitse-grid (telefon + tablet portræt). */
function mskIsProjectsPortraitSketchGridViewport() {
	try {
		return !!(mskIsProjectsTabletPortraitViewport() || mskIsProjectsPhonePortraitViewport());
	} catch (_) {
		return false;
	}
}

/** Aktivt portræt-skitse-grid (telefon + tablet) — samme design, samme ringe/streger. */
function mskIsProjectsPortraitGridRingsMode() {
	try {
		return !!(
			mskIsProjectsPortraitGridDocumentMode() ||
			(document.querySelector('.brainstorm-container') &&
				document.querySelector('.brainstorm-container').classList.contains('projects-mindmap--portrait'))
		);
	} catch (_) {
		return false;
	}
}

/** HTML-klasse + viewport: portræt-grid aktiv uanset timing i init/resize. */
function mskIsProjectsPortraitGridDocumentMode() {
	try {
		return !!(
			document.documentElement.classList.contains('msk-projects-phone-portrait') ||
			document.documentElement.classList.contains('msk-projects-ipad-portrait') ||
			mskIsProjectsPortraitSketchGridViewport()
		);
	} catch (_) {
		return false;
	}
}

/** Stabilt layout-mål til portræt-grid — KUN synlig viewport (inner*), aldrig clientHeight/papir. */
function mskProjectsPortraitLayoutViewportPx() {
	try {
		const iw = Math.round(Math.max(1, window.innerWidth || 1));
		const ih = Math.round(Math.max(1, window.innerHeight || 1));
		return { w: iw, h: ih };
	} catch (_) {
		return { w: 375, h: 667 };
	}
}

/** iPad portraet = 1; telefon portraet = kontinuerlig skala fra iPhone 12 Pro (390px). */
function mskProjectsPortraitReferenceScale() {
	try {
		if (mskIsProjectsTabletPortraitViewport()) return 1;
		if (!mskIsProjectsPhonePortraitViewport()) return 1;
		const w = mskProjectsPortraitLayoutViewportPx().w || window.innerWidth || 375;
		try {
			if (typeof mskGetPhonePortraitProfileFactors === 'function') {
				return mskGetPhonePortraitProfileFactors(w).portraitScale;
			}
		} catch (_) {}
		const refW = 390;
		const refH = 844;
		const refBase = (refW / 1024) * 0.98;
		const layoutPx =
			typeof mskPhonePortraitLayoutPx === 'function'
				? mskPhonePortraitLayoutPx(w)
				: { w: w, h: window.innerHeight || refH };
		const wRatio = (layoutPx.w || w) / refW;
		const hRatio = (layoutPx.h || refH) / refH;
		const fitRatio = Math.max(0.48, Math.min(1.62, wRatio * 0.52 + hRatio * 0.48));
		return refBase * fitRatio;
	} catch (_) {
		return 0.38;
	}
}

/** Telefon portræt: skaler iPad-lock ringe/streger til smal viewport (læs kun lock — ændrer ikke iPad). */
function mskProjectsPhonePortraitIpadScale() {
	return mskProjectsPortraitReferenceScale();
}

function mskProjectsPortraitGridLayoutPx() {
	return mskProjectsPortraitLayoutViewportPx();
}

function mskProjectsPortraitReferenceCanvasPx() {
	return mskProjectsPortraitGridLayoutPx();
}

/** Telefon: fuld viewport, ingen canvas-transform — ryd evt. gammel inline styling. */
function mskApplyProjectsPortraitPhoneCanvasStyles() {
	try {
		const container = document.querySelector('.brainstorm-container');
		if (!container) return;
		container.classList.remove('projects-mindmap--phone-canvas');
		container.removeAttribute('data-msk-portrait-canvas');
		if (!mskIsProjectsPhonePortraitViewport() && !document.documentElement.classList.contains('msk-projects-phone-portrait')) {
			return;
		}
		if (!container.classList.contains('projects-mindmap--portrait')) return;
		container.style.setProperty('position', 'fixed', 'important');
		container.style.setProperty('inset', '0', 'important');
		container.style.setProperty('width', '100%', 'important');
		container.style.setProperty('height', '100dvh', 'important');
		container.style.setProperty('display', 'block', 'important');
		container.style.setProperty('visibility', 'visible', 'important');
		container.style.setProperty('opacity', '1', 'important');
		container.style.setProperty('overflow', 'visible', 'important');
		container.style.setProperty('z-index', '3', 'important');
		container.style.setProperty('transform', 'none', 'important');
		container.style.removeProperty('left');
		container.style.removeProperty('top');
		container.style.removeProperty('max-width');
		container.style.removeProperty('max-height');
	} catch (_) {}
}

function mskClearProjectsPortraitPhoneCanvasStyles() {
	mskApplyProjectsPortraitPhoneCanvasStyles();
}

/** Tving telefon-portræt-klasser (DevTools resize, file://). */
function mskEnsureProjectsPhonePortraitCanvasMode() {
	try {
		if (!document.body || !document.body.classList.contains('projects-page')) return false;
		const iw = Math.round(Math.max(1, window.innerWidth || 0));
		const ih = Math.round(Math.max(1, window.innerHeight || 0));
		if (iw > 640 || ih <= iw + 8) return false;
		if (mskIsProjectsTabletLandscapeViewport() || mskIsProjectsShortLandscapeViewport()) return false;
		document.documentElement.classList.add('msk-projects-phone-portrait', 'msk-projects-phone-portrait-no-scroll');
		const container = document.querySelector('.brainstorm-container');
		if (container) container.classList.add('projects-mindmap--portrait');
		return true;
	} catch (_) {
		return false;
	}
}

/**
 * DevTools iPad landskab: orientation: landscape matcher, men innerWidth/innerHeight kan stadig være byttet (1024×1366).
 * Returner layout-bredde/højde med korteste kant som højde når vi er i tablet-landskab-tilstand.
 */
function mskProjectsTabletLandscapeLayoutPx() {
	try {
		let iw = Math.round(Math.max(1, window.innerWidth || 0));
		let ih = Math.round(Math.max(1, window.innerHeight || 0));
		const vv = window.visualViewport;
		if (vv && vv.width >= 200 && vv.height >= 200) {
			iw = Math.round(Math.max(1, Math.min(iw, vv.width)));
			ih = Math.round(Math.max(1, Math.min(ih, vv.height)));
		}
		const landscapeMq =
			!!(
				window.matchMedia &&
				(window.matchMedia('(orientation: landscape)').matches ||
					window.matchMedia('(min-aspect-ratio: 1/1)').matches)
			);
		const inTabletBand =
			Math.max(iw, ih) >= 1024 &&
			Math.max(iw, ih) <= 1366 &&
			Math.min(iw, ih) >= 600;
		/* Kun byt mål når orientation faktisk er landscape — ikke pga. hængende html-klasse i portræt */
		if (landscapeMq && inTabletBand && ih > iw) {
			return { w: ih, h: iw, swapped: true };
		}
		if (iw > ih + 16 && iw >= 1024 && iw <= 1366) return { w: iw, h: ih, swapped: false };
		if (ih > iw + 16 && ih >= 1024 && ih <= 1366) return { w: ih, h: iw, swapped: true };
		return { w: iw, h: ih, swapped: false };
	} catch (_) {
		return {
			w: Math.round(Math.max(1, window.innerWidth || 1)),
			h: Math.round(Math.max(1, window.innerHeight || 1)),
			swapped: false,
		};
	}
}

/**
 * Projekter: iPad / tablet landskab (1024–1366 bred) — desktop-ellipse, ikke lodret portræt-grid.
 */
function mskIsProjectsTabletLandscapeViewport() {
	try {
		const iw = Math.round(Math.max(1, window.innerWidth || 0));
		const ih = Math.round(Math.max(1, window.innerHeight || 0));
		const longSide = Math.max(iw, ih);
		const shortSide = Math.min(iw, ih);
		const inTabletBand = longSide >= 1024 && longSide <= 1366 && shortSide >= 600;
		if (inTabletBand && ih > iw + 16) {
			let portraitMq = false;
			try {
				portraitMq = !!(
					window.matchMedia &&
					(window.matchMedia('(orientation: portrait)').matches ||
						window.matchMedia('(max-aspect-ratio: 1/1)').matches)
				);
			} catch (_) {}
			if (portraitMq) return false;
		}
		const dim = mskProjectsTabletLandscapeLayoutPx();
		if (dim.w >= 1024 && dim.w <= 1366 && dim.h >= 600 && dim.w > dim.h + 16) return true;
		if (!window.matchMedia) return false;
		const mqA = window.matchMedia(
			'(min-width: 1024px) and (max-width: 1366px) and (orientation: landscape)'
		);
		const mqB = window.matchMedia(
			'(min-width: 1024px) and (max-width: 1366px) and (min-aspect-ratio: 1/1)'
		);
		return !!((mqA && mqA.matches) || (mqB && mqB.matches));
	} catch (_) {
		return false;
	}
}

/** Projekter touch: tablet landskab = ellipse; tablet/telefon portræt = 2+2-grid; telefon landskab = ellipse. */
function mskApplyProjectsIpadLandscapeDocumentMode() {
	try {
		if (!document.body || !document.body.classList.contains('projects-page')) return false;
		const tabletPortrait = mskIsProjectsTabletPortraitViewport();
		const phonePortrait = mskIsProjectsPhonePortraitViewport();
		const phoneLandscape = mskIsProjectsPhoneLandscapeViewport();
		let tabletLandscape = !tabletPortrait && !phonePortrait && mskIsProjectsTabletLandscapeViewport();
		/* DevTools: orientation landscape men inner* byttet — kun når vi ikke er i portræt-grid */
		if (!tabletLandscape && !tabletPortrait && !phonePortrait && !phoneLandscape) {
			try {
				const dim = mskProjectsTabletLandscapeLayoutPx();
				if (dim.w >= 1024 && dim.w <= 1366 && dim.h >= 600 && dim.w > dim.h + 16) tabletLandscape = true;
			} catch (_) {}
		}
		const portraitGrid = tabletPortrait || phonePortrait;
		const on = tabletLandscape;

		document.documentElement.classList.toggle('msk-projects-ipad-landscape', tabletLandscape);
		document.documentElement.classList.toggle('msk-projects-ipad-landscape-no-scroll', tabletLandscape);
		document.documentElement.classList.toggle('msk-projects-ipad-portrait', tabletPortrait);
		document.documentElement.classList.toggle('msk-projects-phone-portrait', phonePortrait);
		document.documentElement.classList.toggle('msk-projects-phone-landscape', phoneLandscape);
		document.documentElement.classList.toggle(
			'msk-projects-phone-portrait-no-scroll',
			phonePortrait
		);
		if (phonePortrait) {
			try {
				if (typeof mskApplyPhonePortraitProfileDocument === 'function') {
					mskApplyPhonePortraitProfileDocument();
				}
			} catch (_) {}
		}
		const container = document.querySelector('.brainstorm-container');
		if (container) {
			if (tabletLandscape || phoneLandscape) {
				container.classList.remove('projects-mindmap--portrait', 'projects-mindmap--phone-canvas');
			} else if (portraitGrid) {
				container.classList.add('projects-mindmap--portrait');
				container.classList.remove('projects-mindmap--phone-canvas');
			}
			container.classList.toggle('projects-mindmap--ipad-landscape', tabletLandscape);
		}
		if (on) {
			mskApplyUngeModUvIpadLandscapeTitleNudge();
			mskApplyDurexIpadLandscapeTitleNudge();
			mskApplyBrainfartsIpadLandscapeConstructionSign();
			mskSyncBrainfartsIpadConstructionSignOpacity();
		} else {
			mskClearUngeModUvIpadLandscapeTitleNudge();
			mskClearDurexIpadLandscapeTitleNudge();
			if (portraitGrid) mskApplyProjectsPortraitPhoneCanvasStyles();
			else mskClearProjectsPortraitPhoneCanvasStyles();
		}
		return on;
	} catch (_) {
		return false;
	}
}

/** Portræt-grid efterladt DOM/inline (typisk portræt→landskab uden refresh). */
function mskProjectsMindmapHasPortraitGridArtifacts() {
	try {
		const container = document.querySelector('.brainstorm-container');
		if (!container) return false;
		if (container.querySelector('.msk-portrait-ring-overlay')) return true;
		if (container.classList.contains('projects-mindmap--portrait')) return true;
		if (document.querySelector('.project-node[data-msk-grid-cx]')) return true;
		return !!document.querySelector('.project-node[style*="left"]');
	} catch (_) {
		return false;
	}
}

/** Fjern portræt-grid så ellipse-landskab kan tegnes rent (tablet portræt→landskab). */
function mskProjectsMindmapClearPortraitGridArtifacts() {
	try {
		if (!document.body || !document.body.classList.contains('projects-page')) return;
		const container = document.querySelector('.brainstorm-container');
		const svg = document.querySelector('.connecting-lines');
		const brain = document.querySelector('.brain');
		const nodes = document.querySelectorAll('.project-node');

		if (container) {
			container.querySelectorAll('.msk-portrait-ring-overlay').forEach((el) => {
				try {
					el.remove();
				} catch (_) {}
			});
			[
				'position',
				'inset',
				'width',
				'height',
				'display',
				'visibility',
				'opacity',
				'z-index',
				'transform',
				'left',
				'top',
				'right',
				'bottom',
				'max-width',
				'max-height',
				'overflow',
			].forEach((prop) => {
				try {
					container.style.removeProperty(prop);
				} catch (_) {}
			});
			container.classList.remove('projects-mindmap--portrait', 'projects-mindmap--phone-canvas');
			container.removeAttribute('data-msk-portrait-canvas');
		}
		if (svg) {
			try {
				delete svg.dataset.mskDynamicGraphicsBuilt;
			} catch (_) {}
			svg.querySelectorAll('.dynamic-mindmap-line, .mobile-mindmap-line').forEach((el) => {
				try {
					el.remove();
				} catch (_) {}
			});
		}
		if (brain) {
			try {
				brain.removeAttribute('style');
			} catch (_) {}
		}
		nodes.forEach((node) => {
			try {
				node.removeAttribute('style');
				delete node.dataset.mskGridCx;
				delete node.dataset.mskGridCy;
				const title = node.querySelector('.project-node__title');
				if (title) title.removeAttribute('style');
				node.querySelectorAll('.node-label').forEach((el) => el.removeAttribute('style'));
				node
					.querySelectorAll(
						'.dandd-badge--inline, .kravling-nomineret-badge--inline, .kobajer-kravling-2024-badge--inline'
					)
					.forEach((el) => el.remove());
				const bfSign = node.querySelector('.brainfarts-build__sign--inline');
				if (bfSign) bfSign.remove();
			} catch (_) {}
		});
		if (container) {
			[
				'.repop-kravling-line',
				'.twister-dandd-line',
				'.kobajer-arrow',
				'.dandd-badge',
				'.kravling-nomineret-badge',
				'.kobajer-kravling-2024-badge',
			].forEach((sel) => {
				container.querySelectorAll(sel).forEach((el) => {
					try {
						el.removeAttribute('style');
					} catch (_) {}
				});
			});
		}
	} catch (_) {}
}

/** Tablet rotation: opdatér html-klasser, ryd portræt-rester, genlayout uden refresh. */
function mskProjectsMindmapRelayoutAfterTabletOrientation(force) {
	try {
		if (!document.body || !document.body.classList.contains('projects-page')) return;
		const enteringLandscape = !!mskIsProjectsTabletLandscapeViewport();
		mskApplyProjectsIpadLandscapeDocumentMode();
		if (enteringLandscape && mskProjectsMindmapHasPortraitGridArtifacts()) {
			mskProjectsMindmapClearPortraitGridArtifacts();
		}
		if (enteringLandscape) {
			document.documentElement.classList.remove('msk-mindmap-booting', 'msk-projects-ipad-portrait');
			document.documentElement.classList.add('msk-projects-mindmap-painted');
			const c = document.querySelector('.brainstorm-container');
			if (c) {
				c.classList.remove('projects-mindmap--portrait');
				c.dataset.mskRevealed = '1';
			}
		}
		try {
			if (typeof window.__mskProjectsRelayout === 'function') {
				window.__mskProjectsRelayout(!!force);
			}
		} catch (_) {}
		try {
			document.documentElement.dispatchEvent(new CustomEvent('msk-relayout-projects-mindmap'));
		} catch (_) {}
	} catch (_) {}
}

try {
	window.mskProjectsMindmapRelayoutAfterTabletOrientation = mskProjectsMindmapRelayoutAfterTabletOrientation;
} catch (_) {}

const MSK_BRAINFARTS_IPAD_SIGN_OPACITY = 0.74;

/** iPad landskab: gennemsigtighed på SVG-trekant (CSS kan ikke ramme pga. opacity:1 på alle image). */
function mskSyncBrainfartsIpadConstructionSignOpacity() {
	try {
		if (!mskIsProjectsTabletLandscapeViewport()) return;
		const svg = document.querySelector('.brainstorm-container .connecting-lines');
		if (!svg) return;
		const op = String(MSK_BRAINFARTS_IPAD_SIGN_OPACITY);
		svg.querySelectorAll('.brainfarts-ipad-construction-wrap').forEach((wrap) => {
			try {
				wrap.setAttribute('opacity', op);
				wrap.style.setProperty('opacity', op, 'important');
				wrap.style.setProperty('mix-blend-mode', 'multiply', 'important');
				wrap.style.setProperty('pointer-events', 'none', 'important');
			} catch (_) {}
		});
		svg.querySelectorAll('image.brainfarts-ipad-construction-sign').forEach((img) => {
			try {
				img.setAttribute('opacity', op);
				img.style.setProperty('opacity', op, 'important');
				img.style.setProperty('mix-blend-mode', 'normal', 'important');
				img.style.setProperty('pointer-events', 'none', 'important');
			} catch (_) {}
		});
	} catch (_) {}
}

/** iPad landskab: fjern HTML-dublet — trekant tegnes kun som SVG i createHandDrawnFrames. */
function mskApplyBrainfartsIpadLandscapeConstructionSign() {
	try {
		if (!mskIsProjectsTabletLandscapeViewport()) return;
		const container = document.querySelector('.brainstorm-container');
		if (!container || container.classList.contains('projects-mindmap--portrait')) return;
		const bf = container.querySelector('a[href*="brainfarts"], .project-node[href*="brainfarts"]');
		if (!bf) return;
		bf.querySelectorAll('.brainfarts-build__sign--inline').forEach((el) => {
			try {
				el.remove();
			} catch (_) {}
		});
	} catch (_) {}
}

/** iPad landskab: UNGE MOD UV — kun tekst-webp ned i cirklen (SVG-ring forbliver centreret på noden). */
function mskApplyUngeModUvIpadLandscapeTitleNudge() {
	try {
		if (!mskIsProjectsTabletLandscapeViewport()) return;
		const container = document.querySelector('.brainstorm-container');
		if (!container || container.classList.contains('projects-mindmap--portrait')) return;
		const img = container.querySelector(
			'a.project-node[href*="unge-mod-uv"] .project-node__title-img--unge-mod-uv'
		);
		if (!img) return;
		let downPx = 12;
		let rightPx = 10;
		try {
			const lv = mskProjectsLayoutViewportBox();
			downPx = Math.round(Math.max(10, Math.min(16, (lv.w || 1366) * 0.01)));
			rightPx = Math.round(Math.max(8, Math.min(14, (lv.w || 1366) * 0.008)));
		} catch (_) {}
		const scale = 1.44;
		img.style.setProperty('max-width', 'min(164px, 12.2vw)', 'important');
		img.style.setProperty('width', '100%', 'important');
		img.style.setProperty(
			'transform',
			`translate(${rightPx}px, ${downPx}px) scale(${scale})`,
			'important'
		);
		img.style.setProperty('transform-origin', 'center center', 'important');
	} catch (_) {}
}

function mskClearUngeModUvIpadLandscapeTitleNudge() {
	try {
		const img = document.querySelector(
			'.brainstorm-container a.project-node[href*="unge-mod-uv"] .project-node__title-img--unge-mod-uv'
		);
		if (!img) return;
		img.style.removeProperty('transform');
		img.style.removeProperty('transform-origin');
		img.style.removeProperty('max-width');
		img.style.removeProperty('width');
	} catch (_) {}
}

/** iPad landskab: DUREX — mindre tekst + lidt mod venstre i cirklen (ring uændret). */
function mskApplyDurexIpadLandscapeTitleNudge() {
	try {
		if (!mskIsProjectsTabletLandscapeViewport()) return;
		const container = document.querySelector('.brainstorm-container');
		if (!container || container.classList.contains('projects-mindmap--portrait')) return;
		const img = container.querySelector(
			'a.project-node[href*="durex"] .project-node__title-img--durex'
		);
		if (!img) return;
		let leftPx = 0;
		let downPx = 2;
		const scale = 1.56;
		try {
			const lv = mskProjectsLayoutViewportBox();
			leftPx = Math.round(Math.max(0, Math.min(6, (lv.w || 1366) * 0.003)));
			downPx = Math.round(Math.max(0, Math.min(4, (lv.h || 1024) * 0.003)));
		} catch (_) {}
		img.style.setProperty('max-width', 'min(172px, 12.8vw)', 'important');
		img.style.setProperty('width', '100%', 'important');
		img.style.setProperty(
			'transform',
			`translate(${leftPx}px, ${downPx}px) scale(${scale})`,
			'important'
		);
		img.style.setProperty('transform-origin', 'center center', 'important');
		img.style.removeProperty('margin-left');
		img.style.removeProperty('margin-right');
	} catch (_) {}
}

function mskClearDurexIpadLandscapeTitleNudge() {
	try {
		const img = document.querySelector(
			'.brainstorm-container a.project-node[href*="durex"] .project-node__title-img--durex'
		);
		if (!img) return;
		img.style.removeProperty('transform');
		img.style.removeProperty('transform-origin');
		img.style.removeProperty('max-width');
		img.style.removeProperty('width');
		img.style.removeProperty('margin-left');
		img.style.removeProperty('margin-right');
	} catch (_) {}
}

(function mskProjectsIpadLandscapeBootstrap() {
	function tick() {
		const hadPortraitArtifacts = mskProjectsMindmapHasPortraitGridArtifacts();
		const on = mskApplyProjectsIpadLandscapeDocumentMode();
		if (on && hadPortraitArtifacts) mskProjectsMindmapClearPortraitGridArtifacts();
	}
	function onOrientation() {
		[40, 280, 520].forEach((ms) => {
			window.setTimeout(() => mskProjectsMindmapRelayoutAfterTabletOrientation(true), ms);
		});
	}
	tick();
	window.addEventListener('resize', tick);
	window.addEventListener('orientationchange', onOrientation);
	document.addEventListener('DOMContentLoaded', tick);
})();

/** Projekter desktop: “Under ombygning” + pil lige under BRAINFARTS-cirklen (følger SVG-ring efter layout). */
function positionBrainfartsBuildNote() {
	try {
		if (!document.body || !document.body.classList.contains('projects-page')) return;
		const build = document.querySelector('.brainfarts-build');
		if (!build) return;
		const w = mskProjectsLayoutViewportBox().w || 0;
		if (
			w < 1025 ||
			mskIsProjectsShortLandscapeViewport() ||
			mskIsProjectsTabletLandscapeViewport()
		) {
			build.style.removeProperty('left');
			build.style.removeProperty('top');
			build.style.removeProperty('right');
			build.style.removeProperty('bottom');
			build.style.removeProperty('transform');
			return;
		}
		const container = document.querySelector('.brainstorm-container');
		if (!container) return;
		const frameEl = document.querySelector('.connecting-lines image.brainfarts-image');
		const bfNode = document.querySelector('a[href*="brainfarts"]');
		const cRect = container.getBoundingClientRect();
		let ringRect = frameEl ? frameEl.getBoundingClientRect() : null;
		if (!ringRect || ringRect.width < 2) {
			if (!bfNode) return;
			ringRect = bfNode.getBoundingClientRect();
		}
		const cx = ringRect.left + ringRect.width / 2 - cRect.left;
		const leftNudgePx = 48;
		const leftPx = cx - leftNudgePx;
		/* Højere op mod ringen (pil + skilt tættere på cirklen) */
		const topPx = ringRect.bottom - cRect.top - 70;
		build.style.setProperty('left', `${Math.round(leftPx)}px`, 'important');
		build.style.setProperty('top', `${Math.round(topPx)}px`, 'important');
		build.style.setProperty('right', 'auto', 'important');
		build.style.setProperty('bottom', 'auto', 'important');
		build.style.setProperty('transform', 'translateX(-50%)', 'important');
	} catch (_) {}
}

/** iOS home indicator m.m. — portrait mindmap: trækker “bund” op så nederste knapper ikke sidder i safe area. */
function mskSafeAreaInsetBottomPx() {
	try {
		const t = document.createElement('div');
		t.style.cssText =
			'position:fixed;visibility:hidden;left:0;bottom:0;width:0;height:0;margin:0;border:0;padding:0;padding-bottom:env(safe-area-inset-bottom,0px);';
		document.body.appendChild(t);
		const v = parseFloat(getComputedStyle(t).paddingBottom) || 0;
		t.remove();
		return Math.round(v);
	} catch {
		return 0;
	}
}

/** Projekter mindmap: fjern fokus efter tap/pointerup — WebKit (Safari/iPad) viser ellers blå ramme på <a> trods CSS. */
function mskBindProjectsMindmapLinkBlurAfterTap() {
	try {
		if (!document.body || !document.body.classList.contains('projects-page')) return;
		if (document.documentElement.dataset.mskProjectsMindmapLinkBlurBound === '1') return;
		const stage = document.querySelector('.brainstorm-container');
		if (!stage) return;
		document.documentElement.dataset.mskProjectsMindmapLinkBlurBound = '1';
		const scheduleBlur = () => {
			try {
				window.requestAnimationFrame(() => {
					try {
						window.requestAnimationFrame(() => {
							try {
								const a = document.activeElement;
								if (a && typeof a.matches === 'function' && a.matches('a.project-node') && stage.contains(a)) {
									a.blur();
								}
							} catch (_) {}
						});
					} catch (_) {}
				});
			} catch (_) {}
		};
		stage.addEventListener('pointerup', scheduleBlur, { capture: true, passive: true });
		stage.addEventListener('touchend', scheduleBlur, { capture: true, passive: true });
	} catch (_) {}
}

/**
 * Vandrette papirlinjer — DOM-lag med CSS repeating-linear-gradient (ikke canvas-bitmap).
 * Skalerer med side-zoom/pinch uden at tynde streger forsvinder ved subpixel/rasterisering.
 */
function mskSketchbookPaperLinesDraw() {
	try {
		if (!document.body) return;
		if (!document.body.classList.contains('sketchbook-theme')) {
			const oldCanvas = document.getElementById('msk-sketch-paper-lines');
			if (oldCanvas) oldCanvas.remove();
			const oldLayer = document.getElementById('msk-paper-lines-layer');
			if (oldLayer) oldLayer.remove();
			return;
		}
		const oldCanvas = document.getElementById('msk-sketch-paper-lines');
		if (oldCanvas) oldCanvas.remove();
		let layer = document.getElementById('msk-paper-lines-layer');
		if (!layer) {
			layer = document.createElement('div');
			layer.id = 'msk-paper-lines-layer';
			layer.className = 'msk-paper-lines-layer';
			layer.setAttribute('aria-hidden', 'true');
			const left = document.createElement('div');
			left.className = 'msk-paper-lines-layer__half msk-paper-lines-layer__half--left';
			const right = document.createElement('div');
			right.className = 'msk-paper-lines-layer__half msk-paper-lines-layer__half--right';
			layer.appendChild(left);
			layer.appendChild(right);
			document.body.insertBefore(layer, document.body.firstChild);
		}
	} catch (_) {}
}

(function syncMobileVhFromVisualViewport() {
	let raf = null;
	/** Undgå at gentagne visualViewport-resize (pinch-zoom) spammer style-opdateringer — kan udløse Safari WebContent-nedbrud på sketchbook-sider. */
	let vvResizeDebounce = null;
	let lastVhPx = -1;
	let lastVwPx = -1;
	let lastSketchPaperMinHPx = -1;
	function apply() {
		if (raf) cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			raf = null;
			try {
				/* iPad landskab er typisk >1024px bred — inkl. touch-tablet 641–1366 så --vh/--vw ikke “falder fra” ved rotation */
				const narrowViewport =
					window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
				const narrowTouchTablet =
					window.matchMedia &&
					window.matchMedia('(min-width: 641px) and (max-width: 1366px)').matches &&
					window.matchMedia('(hover: none) and (pointer: coarse)').matches;
				const narrow = !!(narrowViewport || narrowTouchTablet);
				const sketch =
					document.body && document.body.classList && document.body.classList.contains('sketchbook-theme');
				const projectsPage =
					document.body && document.body.classList && document.body.classList.contains('projects-page');
				if (!narrow && !sketch) {
					document.documentElement.style.removeProperty('--vh');
					document.documentElement.style.removeProperty('--vw');
					document.documentElement.style.removeProperty('--sketchPaperMinH');
					lastVhPx = -1;
					lastVwPx = -1;
					lastSketchPaperMinHPx = -1;
					mskSketchbookPaperLinesDraw();
					return;
				}
				const repopPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('repop-page');
				const ungeModUvPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('unge-mod-uv-page');
				const naturligPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('naturlig-page');
				const durexPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('durex-page');
				const twisterPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('twister-page');
				const kobajerPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('kobajer-page');
				const byensLandhandelPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('byens-landhandel-page');
				const contactSketchbookPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('contact-sketchbook-page');
				const aboutSketchbookPage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('about-sketchbook-page');
				const aiUniversePage =
					document.body &&
					document.body.classList &&
					document.body.classList.contains('ai-universe-page');
				/*
				 * Repop: tidligere kun window.inner* — i mobil-landskab (og nogle WebKit/DevTools-tilstande) kan innerWidth/innerHeight give vanvittige tal (fx ~9 og ~4 px) → --vh/--vw kollapser og “hvid kasse”/overlay-følelse.
				 * Repop + Unge mod UV + Naturli' + Durex + … + AI Universe: layout-viewport (client*) — stabil.
				 * Projekter+sketch: layout-viewport. Øvrige: mskSanitizedViewportSize.
				 */
				let w;
				let h;
				if (repopPage || ungeModUvPage) {
					const b = mskProjectsLayoutViewportBox();
					w = b.w;
					h = b.h;
				} else if (durexPage || kobajerPage) {
					/*
					 * Layout-viewport (client*), ikke visualViewport: ved pinch-zoom krymper VV → --vh/--vw blev mikroskopiske
					 * og Durex/Kø-Bajer `min-height: var(--vh)` kollapsede (format skiftede). RDM-fallbacks nedenfor bibeholdes.
					 */
					const b = mskProjectsLayoutViewportBox();
					w = b.w;
					h = b.h;
				} else if (
					naturligPage ||
					twisterPage ||
					byensLandhandelPage ||
					contactSketchbookPage ||
					aboutSketchbookPage ||
					aiUniversePage
				) {
					const b = mskProjectsLayoutViewportBox();
					w = b.w;
					h = b.h;
				} else if (projectsPage && sketch) {
					const b = mskProjectsLayoutViewportBox();
					w = b.w;
					h = b.h;
				} else {
					const b = mskSanitizedViewportSize();
					w = b.w;
					h = b.h;
				}
				const iwClamp = Math.round(Math.max(1, window.innerWidth || 0));
				const ihClamp = Math.round(Math.max(1, window.innerHeight || 0));
				if (ihClamp > 200 && h < 120) h = ihClamp;
				if (iwClamp > 200 && w < 120) w = iwClamp;
				/* Sidste udvej hvis w/h stadig er urimelige (landskab-bugs, split-second frames) */
				if (w < 80 || h < 80) {
					const fb = mskProjectsLayoutViewportBox();
					if (fb.w >= 80 && fb.h >= 80) {
						w = fb.w;
						h = fb.h;
					}
				}
				let rh = Math.round(Math.max(0, h));
				let rw = Math.round(Math.max(0, w));
				const lb = mskProjectsLayoutViewportBox();
				/*
				 * Brug største plausible kant — RDM/DevTools kan levere ét tal forkert (fx h≈10 mens innerHeight≈1024),
				 * hvilket gav --vh på få px og knækkede layout + lightbox.
				 */
				if (ihClamp >= 200) {
					rh = Math.round(Math.max(rh, ihClamp, lb.h));
				}
				if (iwClamp >= 200) {
					rw = Math.round(Math.max(rw, iwClamp, lb.w));
				}
				if (rh < 80 && lb.h >= 80) rh = lb.h;
				if (rw < 80 && lb.w >= 80) rw = lb.w;
				/*
				 * RDM / visualViewport-flip: rh kan ende som ~1vh i px (fx 13–14 ved 1366 højde) trods ihClamp.
				 * Uden dette sættes --vh forkert og alt der bruger var(--vh) + lysboks-fallback (vh) opfører sig inkonsistent.
				 */
				if (ihClamp >= 320 && rh > 0 && rh < 120) {
					rh = Math.round(Math.max(rh, ihClamp, lb.h));
				}
				if (iwClamp >= 320 && rw > 0 && rw < 120) {
					rw = Math.round(Math.max(rw, iwClamp, lb.w));
				}
				if (ihClamp >= 320 && rh < ihClamp * 0.22) {
					rh = Math.round(Math.max(rh, ihClamp, lb.h));
				}
				if (iwClamp >= 320 && rw < iwClamp * 0.22) {
					rw = Math.round(Math.max(rw, iwClamp, lb.w));
				}
				/*
				 * Kontakt/Om mig iPad landskab (1024–1366): inner* er ofte korrekt mens client* er ~10px i DevTools.
				 * CSS på kontakt bruger 100dvh direkte, men fjern også en ødelagt inline --vh/--vw.
				 */
				if (sketch && (contactSketchbookPage || aboutSketchbookPage) && ihClamp >= 320) {
					rh = Math.round(Math.max(rh, ihClamp, lb.h));
					rw = Math.round(Math.max(rw, iwClamp, lb.w));
				}
				const sketchTabletLandscape =
					sketch &&
					(contactSketchbookPage || aboutSketchbookPage) &&
					window.matchMedia &&
					window.matchMedia('(min-width: 1024px) and (max-width: 1366px)').matches &&
					((window.matchMedia('(orientation: landscape)').matches ||
						window.matchMedia('(min-aspect-ratio: 1/1)').matches));
				const applyVhVwPx = narrow || sketchTabletLandscape;
				/* Aldrig skriv mikroskopisk --vh (fx 10.24px) — ødelægger var(--vh) på andre sider */
				const vhPxOk = rh >= 200 && rw >= 200;
				/*
				 * Kontakt: ALDRIG inline --vh/--vw. DevTools kan sætte ~10px (viewport/100) → scroll.
				 * Landskab låses via CSS + html.msk-contact-ipad-landscape-no-scroll.
				 */
				if (contactSketchbookPage) {
					document.documentElement.style.removeProperty('--vh');
					document.documentElement.style.removeProperty('--vw');
					lastVhPx = -1;
					lastVwPx = -1;
				} else if (projectsPage && sketch && mskIsProjectsTabletLandscapeViewport()) {
					/* Projekter iPad landskab: brug 100dvh i CSS — undgå ødelagt inline --vh ved dimension-swap */
					document.documentElement.style.removeProperty('--vh');
					document.documentElement.style.removeProperty('--vw');
					lastVhPx = -1;
					lastVwPx = -1;
				} else if (applyVhVwPx) {
					if (!vhPxOk) {
						document.documentElement.style.removeProperty('--vh');
						document.documentElement.style.removeProperty('--vw');
						lastVhPx = -1;
						lastVwPx = -1;
					} else {
						if (rh !== lastVhPx) {
							document.documentElement.style.setProperty('--vh', rh + 'px');
							lastVhPx = rh;
						}
						if (rw !== lastVwPx) {
							document.documentElement.style.setProperty('--vw', rw + 'px');
							lastVwPx = rw;
						}
					}
				} else {
					document.documentElement.style.removeProperty('--vh');
					document.documentElement.style.removeProperty('--vw');
					lastVhPx = -1;
					lastVwPx = -1;
				}
				const contactIpadLandscape =
					contactSketchbookPage &&
					window.matchMedia &&
					window.matchMedia('(min-width: 1024px) and (max-width: 1366px)').matches &&
					(window.matchMedia('(orientation: landscape)').matches ||
						window.matchMedia('(min-aspect-ratio: 1/1)').matches);
				const contactIpadPortrait =
					contactSketchbookPage &&
					window.matchMedia &&
					window.matchMedia('(min-width: 641px) and (max-width: 1366px)').matches &&
					window.matchMedia('(orientation: portrait)').matches &&
					!contactIpadLandscape;
				const projectsIpadLandscape =
					projectsPage &&
					sketch &&
					window.matchMedia &&
					window.matchMedia('(min-width: 1024px) and (max-width: 1366px)').matches &&
					(window.matchMedia('(orientation: landscape)').matches ||
						window.matchMedia('(min-aspect-ratio: 1/1)').matches);
				try {
					document.documentElement.classList.toggle(
						'msk-contact-ipad-landscape-no-scroll',
						!!contactIpadLandscape
					);
					document.documentElement.classList.toggle(
						'msk-contact-ipad-portrait-no-scroll',
						!!contactIpadPortrait
					);
					mskApplyProjectsIpadLandscapeDocumentMode();
				} catch (_) {}
				/* Papir (::before) skal følge synlig højde ved pinch-zoom — ellers klippes/kollapser linjer */
				if (sketch && contactSketchbookPage) {
					const paperH = Math.round(
						Math.max(
							200,
							window.innerHeight || 0,
							mskProjectsLayoutViewportBox().h
						)
					);
					if (paperH !== lastSketchPaperMinHPx) {
						document.documentElement.style.setProperty('--sketchPaperMinH', paperH + 'px');
						lastSketchPaperMinHPx = paperH;
					}
				} else if (sketch && projectsPage) {
					/* Projekter: papirhøjde = synlig viewport (aldrig oppustet rh/bred kant) */
					const paperH = Math.round(Math.max(200, window.innerHeight || 0));
					if (paperH !== lastSketchPaperMinHPx) {
						document.documentElement.style.setProperty('--sketchPaperMinH', paperH + 'px');
						lastSketchPaperMinHPx = paperH;
					}
				} else if (sketch && rh >= 80) {
					if (rh !== lastSketchPaperMinHPx) {
						document.documentElement.style.setProperty('--sketchPaperMinH', rh + 'px');
						lastSketchPaperMinHPx = rh;
					}
				} else {
					document.documentElement.style.removeProperty('--sketchPaperMinH');
					lastSketchPaperMinHPx = -1;
				}
				mskSketchbookPaperLinesDraw();
			} catch {}
		});
	}
	apply();
	try {
		document.addEventListener('DOMContentLoaded', apply);
	} catch {}
	window.addEventListener('resize', apply);
	window.addEventListener('orientationchange', apply);
	document.addEventListener('visibilitychange', () => {
		try {
			if (document.visibilityState === 'visible') apply();
		} catch {}
	});
	window.addEventListener('pageshow', (ev) => {
		try {
			if (ev && ev.persisted) apply();
		} catch {}
	});
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', () => {
			try {
				const b = document.body;
				const sk = b && b.classList && b.classList.contains('sketchbook-theme');
				const proj = b && b.classList && b.classList.contains('projects-page');
				const repop = b && b.classList && b.classList.contains('repop-page');
				/* Om mig / Kontakt / Repop: debounce VV så WebKit/Chrome ikke spammer layout ved pinch og DevTools-emulering */
				if ((sk && !proj) || repop) {
					if (vvResizeDebounce) clearTimeout(vvResizeDebounce);
					vvResizeDebounce = setTimeout(() => {
						vvResizeDebounce = null;
						apply();
					}, 160);
					return;
				}
			} catch (_) {}
			apply();
		});
		/* Ikke scroll: ellers redraw’es papir hver gang man pan’er ved zoom → linjer “lever” */
	}
	/* Virtual keyboard changes visible height (especially Android Chrome) */
	try {
		document.addEventListener(
			'focusin',
			(e) => {
				try {
					const t = e && e.target;
					if (!t || !t.tagName) return;
					const tag = String(t.tagName).toLowerCase();
					if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;
					apply();
				} catch {}
			},
			true
		);
	} catch {}
})();

/* Kø-Bajer: WebKit kan efter rotation lade 2+1-grids “stable” visuelt oven på hinanden — nulstil kompositor-lag */
(function mskKobajerGridRelayoutAfterRotation() {
	function kick() {
		try {
			if (!document.body || !document.body.classList.contains('kobajer-page')) return;
			document.querySelectorAll('.kobajer-info-boxes, .kobajer-steps').forEach((el) => {
				el.style.transform = 'translateZ(0)';
				void el.offsetHeight;
				el.style.removeProperty('transform');
			});
		} catch (_) {}
	}
	function schedule() {
		kick();
		requestAnimationFrame(kick);
		setTimeout(kick, 100);
		setTimeout(kick, 350);
	}
	window.addEventListener('orientationchange', schedule);
	let resizeT = null;
	window.addEventListener('resize', () => {
		try {
			if (!document.body || !document.body.classList.contains('kobajer-page')) return;
		} catch {
			return;
		}
		if (resizeT) clearTimeout(resizeT);
		resizeT = setTimeout(() => {
			resizeT = null;
			schedule();
		}, 80);
	});
})();

/**
 * Site-standard play-knap på alle indlejrede <video> (halvgennemsigtig cirkel + clip-path-pil i CSS).
 * Forælderen til <video> får .video-play-frame; undlad at lægge eget overlay i HTML.
 *
 * Undtagelser: sæt data-no-play-overlay på <video>, eller læg den i .durex-kampagnevideo-wrap.
 * Kalds idempotent (spring over hvis .video-play-btn allerede findes).
 */
function mskInitNativeVideoPlayOverlays() {
	try {
		document.querySelectorAll('video').forEach((vid) => {
			if (vid.hasAttribute('data-no-play-overlay')) return;
			if (vid.closest('.durex-kampagnevideo-wrap')) return;
			const frame = vid.parentElement;
			if (!frame || frame.classList.contains('video-lazy')) return;
			if (frame.querySelector('.video-play-btn')) return;

			frame.classList.add('video-play-frame');
			try {
				const pos = window.getComputedStyle(frame).position;
				if (pos === 'static') frame.style.position = 'relative';
			} catch {}

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'video-play-btn';
			btn.setAttribute('aria-label', 'Afspil video');
			/* Pil tegnes med CSS ::after (clip-path) — SVG i knap er upålidelig i WebKit */
			frame.appendChild(btn);

			function sync() {
				frame.classList.toggle('is-playing', !vid.paused);
			}
			vid.addEventListener('play', sync);
			vid.addEventListener('pause', sync);
			btn.addEventListener('click', function () {
				try {
					vid.play();
				} catch {}
			});
			sync();
		});
	} catch {}
}

/**
 * Transition-iframes (preview=1) og indlejret projects må ikke køre book-overlay init (rekursive iframes).
 */
function mskSkipNestedProjectsBookInits() {
	try {
		if (document.documentElement.classList.contains('transition-preview')) return true;
		const qs = new URLSearchParams(window.location.search || '');
		if (qs.has('preview')) return true;
		const p = (window.location.pathname || '').toLowerCase();
		const isProjects = p.endsWith('/projects.html') || p.endsWith('projects.html');
		if (isProjects && window.self !== window.top) return true;
	} catch (_) {}
	return false;
}

/** Notesbog-animation til Projekter kun fra forsiden (`index.html` har `home-notebook-page`; case-sider har ikke). */
function mskIsHomeIndexPage() {
	try {
		return !!(document.body && document.body.classList && document.body.classList.contains('home-notebook-page'));
	} catch (_) {}
	return false;
}

/** Undertryk gentagne programmatic navigationer fra mobil-menu (pointerup + click, el. dobbelt touch). */
let __mskMenuNavGateMs = 0;

/** Efter page-turn drag: syntetisk click kan ramme nav-links og udløse dobbelt-navigation (især Safari/Chrome på mobil). */
let __mskPageTurnGhostClickGuardUntil = 0;
function mskArmPageTurnGhostClickGuard(ms) {
	try {
		const m = Math.max(380, Math.min(1200, Number(ms) || 520));
		__mskPageTurnGhostClickGuardUntil = Math.max(__mskPageTurnGhostClickGuardUntil, Date.now() + m);
	} catch {}
}

/**
 * Safari/Chrome BFCache: ved tilbage-swipe kan JS-tilstand + overlays fra page-turn efterlades —
 * ghost-click guard blokerer alle interne links, eller body overflow/transition-DOM blokerer visning.
 */
function mskRecoverAfterHistoryRestore() {
	try {
		__mskPageTurnGhostClickGuardUntil = 0;
		__mskMenuNavGateMs = 0;
	} catch (_) {}
	try {
		const b = document.body;
		if (b) {
			b.style.overflow = '';
			const transient = [
				'projects-about-flip-active',
				'projects-about-dragging',
				'projects-contact-flip-active',
				'projects-contact-flipping',
				'projects-contact-double-active',
				'about-projects-flip-active',
				'about-projects-flipping',
				'about-projects-dragging',
				'about-contact-flip-active',
				'about-contact-flipping',
				'about-contact-dragging',
				'contact-about-flip-active',
				'contact-about-flipping',
				'contact-about-dragging',
				'contact-projects-flip-active',
				'cp-flipping',
				'home-opening-projects',
				'home-opening-layout',
				'home-opened-projects',
				'home-shift-projects',
				'home-reveal-projects',
				'projects-transition-active',
			];
			transient.forEach((c) => {
				try {
					b.classList.remove(c);
				} catch (_) {}
			});
		}
	} catch (_) {}
	try {
		document
			.querySelectorAll(
				[
					'.projects-about-transition',
					'.projects-contact-transition',
					'.projects-contact-double-transition',
					'.about-projects-transition',
					'.about-contact-transition',
					'.contact-about-transition',
					'.contact-projects-transition',
					'.projects-transition',
				].join(',')
			)
			.forEach((el) => {
				try {
					el.remove();
				} catch (_) {}
			});
	} catch (_) {}
}

window.addEventListener(
	'pageshow',
	function (e) {
		try {
			if (e && e.persisted) mskRecoverAfterHistoryRestore();
		} catch (_) {}
	},
	false
);

// Simple JavaScript for any interactive functionality
document.addEventListener('DOMContentLoaded', function() {
	// If a page is loaded inside a transition iframe, render "clean" (no navbar),
	// but keep the page's OWN paper design so it matches exactly.
	(function applyTransitionPreviewMode() {
		try {
			const params = new URLSearchParams(window.location.search || '');
			if (!params.has('preview')) return;
			document.documentElement.classList.add('transition-preview');
		} catch {
			// ignore
		}
	})();

	// Første capture-handler: bloker interne link-klik mens et page-turn drag lige har committet (ghost click).
	try {
		document.addEventListener(
			'click',
			(e) => {
				try {
					if (typeof __mskPageTurnGhostClickGuardUntil !== 'number' || Date.now() >= __mskPageTurnGhostClickGuardUntil) return;
					const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
					if (!a) return;
					const hrefRaw = (a.getAttribute('href') || '').trim();
					if (!hrefRaw || hrefRaw.startsWith('#')) return;
					if (/^https?:\/\//i.test(hrefRaw)) return;
					if (e.button !== 0) return;
					e.preventDefault();
					try {
						e.stopImmediatePropagation();
					} catch {}
				} catch {}
			},
			true
		);
	} catch {}

	// Add smooth scrolling for anchor links
	document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function (e) {
			e.preventDefault();
			const target = document.querySelector(this.getAttribute('href'));
			if (target) {
				target.scrollIntoView({
					behavior: 'smooth'
				});
			}
		});
	});











	// Initialize lazy YouTube players
	(function initLazyVideos() {
		const lazyContainers = document.querySelectorAll('.video-lazy');
		lazyContainers.forEach((container) => {
			container.addEventListener('click', function () {
				const videoId = container.getAttribute('data-video-id');
				if (!videoId) return;
				const iframe = document.createElement('iframe');
				iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
				iframe.title = 'Twister Video';
				iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
				iframe.allowFullscreen = true;
				iframe.referrerPolicy = 'strict-origin-when-cross-origin';
				iframe.style.position = 'absolute';
				iframe.style.inset = '0';
				iframe.style.width = '100%';
				iframe.style.height = '100%';
				iframe.style.border = '0';
				container.innerHTML = '';
				container.appendChild(iframe);
			});
		});
	})();

	mskInitNativeVideoPlayOverlays();



	// Desktop-only corner fold hover hint (shows on the page corner itself).
	(function initCornerFoldHoverHints() {
		try {
			if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
		} catch { return; }
		try {
			if (document.querySelector('.corner-fold-hints')) return;
			const layer = document.createElement('div');
			layer.className = 'corner-fold-hints';
			layer.setAttribute('aria-hidden', 'true');
			layer.innerHTML = `
				<div class="corner-fold-hint corner-fold-hint--left" aria-hidden="true"></div>
				<div class="corner-fold-hint corner-fold-hint--right" aria-hidden="true"></div>
			`;
			document.body.appendChild(layer);
		} catch {}

		// Event delegation so it works for both global handles and page-specific handles.
		document.addEventListener('pointerover', (e) => {
			const t = e && e.target && e.target.closest ? e.target.closest('.page-turn-handle') : null;
			if (!t) return;
			if (t.classList.contains('page-turn-handle--right')) document.body.classList.add('corner-fold-right');
			if (t.classList.contains('page-turn-handle--left')) document.body.classList.add('corner-fold-left');
		}, true);
		document.addEventListener('pointerout', (e) => {
			const t = e && e.target && e.target.closest ? e.target.closest('.page-turn-handle') : null;
			if (!t) return;
			const rel = e && e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.page-turn-handle') : null;
			// Only remove if we're leaving the handle entirely.
			if (t.classList.contains('page-turn-handle--right') && !(rel && rel.classList.contains('page-turn-handle--right'))) {
				document.body.classList.remove('corner-fold-right');
			}
			if (t.classList.contains('page-turn-handle--left') && !(rel && rel.classList.contains('page-turn-handle--left'))) {
				document.body.classList.remove('corner-fold-left');
			}
		}, true);
	})();

	console.log('Portfolio website loaded successfully!');

	/** Telefon portræt: layout-viewport kan blive >640px ved zoom — hold mobil-layout (screen.* + orientation, som CSS max-width ikke kan). */
	(function initPhonePortraitZoomStable() {
		function updatePhonePortraitZoomStable() {
			try {
				const sw = window.screen && window.screen.width ? window.screen.width : 0;
				const sh = window.screen && window.screen.height ? window.screen.height : 0;
				const shortSide = Math.min(sw, sh);
				const phoneLike = shortSide > 0 && shortSide <= 640;
				const portrait = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
				document.documentElement.classList.toggle('phone-portrait-zoom-stable', phoneLike && portrait);
			} catch (_) {}
		}
		updatePhonePortraitZoomStable();
		window.addEventListener('orientationchange', function () {
			setTimeout(updatePhonePortraitZoomStable, 100);
		});
		window.addEventListener('resize', function () {
			setTimeout(updatePhonePortraitZoomStable, 100);
		});
	})();

	function closeMobileBurgerMenu() {
		try { document.body.classList.remove('nav-open'); } catch {}
		try {
			const btn = document.querySelector('.nav-toggle');
			if (btn) {
				btn.setAttribute('aria-expanded', 'false');
				btn.setAttribute('aria-label', 'Åbn menu');
			}
		} catch {}
	}

	function isPhoneViewport() {
		try {
			if (!window.matchMedia) return false;
			try {
				if (document.documentElement.classList.contains('phone-portrait-zoom-stable')) return true;
			} catch {}
			if (window.matchMedia('(max-width: 640px)').matches) return true;
			if (window.matchMedia('(min-width: 641px) and (max-width: 1366px) and (hover: none) and (pointer: coarse)').matches)
				return true;
			/* iPad portræt i DevTools og smalle portræt-vinduer: samme burger-layout som tablet-CSS */
			if (window.matchMedia('(min-width: 641px) and (max-width: 1366px) and (orientation: portrait)').matches) return true;
			if (window.matchMedia('(min-width: 641px) and (max-width: 1366px) and (max-aspect-ratio: 1/1)').matches) return true;
			if (window.matchMedia('(max-height: 520px) and (orientation: landscape) and (hover: none) and (pointer: coarse)').matches) return true;
			return false;
		} catch {
			return false;
		}
	}

	// Mobile burger menu (phones; CSS shows .nav-toggle + dropdown only under max-width: 640px)
	(function initMobileBurgerMenu() {
		try {
			if (document.documentElement && document.documentElement.classList.contains('transition-preview')) return;
		} catch {}

		const nav = document.querySelector('.navbar');
		if (!nav) return;
		const container = nav.querySelector('.nav-container') || nav;
		const menu = nav.querySelector('.nav-menu');
		if (!menu) return;

		if (nav.querySelector('.nav-toggle')) return;

		let scrim = document.querySelector('.nav-scrim');
		if (!scrim) {
			scrim = document.createElement('div');
			scrim.className = 'nav-scrim';
			scrim.setAttribute('aria-hidden', 'true');
			document.body.appendChild(scrim);
		}

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'nav-toggle';
		button.setAttribute('aria-label', 'Åbn menu');
		button.setAttribute('aria-expanded', 'false');

		const menuId = (menu.getAttribute('id') || '').trim() || 'site-nav-menu';
		menu.setAttribute('id', menuId);
		button.setAttribute('aria-controls', menuId);

		const bars = document.createElement('span');
		bars.className = 'nav-toggle__bars';
		const mid = document.createElement('span');
		bars.appendChild(mid);

		const label = document.createElement('span');
		label.className = 'nav-toggle__label';
		label.textContent = 'Menu';

		button.appendChild(bars);
		button.appendChild(label);

		container.insertBefore(button, container.firstChild);

		function setOpen(nextOpen) {
			document.body.classList.toggle('nav-open', !!nextOpen);
			button.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
			button.setAttribute('aria-label', nextOpen ? 'Luk menu' : 'Åbn menu');
		}

		function isBurgerVisible() {
			try {
				if (!window.getComputedStyle) return false;
				const cs = window.getComputedStyle(button);
				return !!(cs && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0');
			} catch { return false; }
		}

		function isOpen() {
			return document.body.classList.contains('nav-open');
		}

		button.addEventListener('click', () => setOpen(!isOpen()));
		scrim.addEventListener('click', () => setOpen(false));

		/*
		 * Én navigation pr. tryk: tidligere pointerup + touchend + click kunne udløse flere location.assign
		 * (Safari + Chrome → netværksfejl). Book-/AI-flip kører på document capture og sætter preventDefault —
		 * her i bubble-fasen ser vi defaultPrevented og styrer kun menu + “almindelige” links.
		 */
		menu.addEventListener('click', (e) => {
			try {
				if (!isBurgerVisible() && !isOpen()) return;

				const a = e.target && e.target.closest ? e.target.closest('a') : null;
				if (!a || !menu.contains(a)) return;
				const hrefAttr = (a.getAttribute('href') || '').trim();
				if (!hrefAttr || hrefAttr.startsWith('#')) return;
				if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

				try { setOpen(false); } catch {}

				if (e.defaultPrevented) {
					return;
				}

				const now = Date.now();
				if (now - __mskMenuNavGateMs < 650) {
					try { e.preventDefault(); } catch {}
					return;
				}
				__mskMenuNavGateMs = now;

				try { e.preventDefault(); } catch {}
				try { e.stopPropagation(); } catch {}
				try {
					window.location.assign(a.href);
				} catch {
					try {
						window.location.href = a.href;
					} catch {}
				}
			} catch (_) {}
		});

		window.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') setOpen(false);
		});

		window.addEventListener('resize', () => {
			if (!isPhoneViewport()) setOpen(false);
		});

		/* iPad m.fl.: ved rotation kan layout-opdatering og burger-@media være ude af trit — luk menu og ryd overflow-lock */
		window.addEventListener('orientationchange', () => {
			const unlock = () => {
				try {
					closeMobileBurgerMenu();
				} catch (_) {}
				try {
					if (!document.body.classList.contains('msk-asset-lightbox-open')) {
						document.body.style.removeProperty('overflow');
					}
				} catch (_) {}
			};
			unlock();
			setTimeout(unlock, 120);
			setTimeout(unlock, 380);
		});
	})();

	function getPageFlipMs(fallbackMs) {
		try {
			const root = document.documentElement;
			if (!root || !window.getComputedStyle) return fallbackMs;
			const raw = window.getComputedStyle(root).getPropertyValue('--pageFlipMs').trim();
			if (!raw) return fallbackMs;
			const m = raw.match(/^([0-9]*\\.?[0-9]+)\\s*(ms|s)?$/i);
			if (!m) return fallbackMs;
			const n = Number(m[1]);
			if (!Number.isFinite(n)) return fallbackMs;
			const unit = (m[2] || 'ms').toLowerCase();
			return unit === 's' ? Math.round(n * 1000) : Math.round(n);
		} catch {
			return fallbackMs;
		}
	}

	function getCssVarMsFromEl(el, varName, fallbackMs) {
		try {
			if (!el || !window.getComputedStyle) return fallbackMs;
			const raw = window.getComputedStyle(el).getPropertyValue(varName).trim();
			if (!raw) return fallbackMs;
			const m = raw.match(/^([0-9]*\\.?[0-9]+)\\s*(ms|s)?$/i);
			if (!m) return fallbackMs;
			const n = Number(m[1]);
			if (!Number.isFinite(n)) return fallbackMs;
			const unit = (m[2] || 'ms').toLowerCase();
			return unit === 's' ? Math.round(n * 1000) : Math.round(n);
		} catch {
			return fallbackMs;
		}
	}

	function getPageFlipEase(fallbackEase) {
		try {
			const root = document.documentElement;
			if (!root || !window.getComputedStyle) return fallbackEase;
			const raw = window.getComputedStyle(root).getPropertyValue('--pageFlipEase').trim();
			return raw || fallbackEase;
		} catch {
			return fallbackEase;
		}
	}

	function angleDegFromMatrix3d(transformStr) {
		try {
			const s = String(transformStr || '').trim();
			if (!s || s === 'none') return null;
			if (!s.startsWith('matrix3d(') || !s.endsWith(')')) return null;
			const nums = s.slice(9, -1).split(',').map((v) => Number(String(v).trim()));
			if (nums.length !== 16 || nums.some((n) => !Number.isFinite(n))) return null;
			// CSS matrix3d is column-major. For rotateY(θ): m11 = cosθ, m31 = sinθ.
			const m11 = nums[0];
			const m31 = nums[8];
			const rad = Math.atan2(m31, m11);
			return (rad * 180) / Math.PI;
		} catch {
			return null;
		}
	}

	function navigateAfterFlip({ element, fallbackMs, href }) {
		let done = false;
		function finish() {
			if (done) return;
			done = true;
			try { window.location.href = href; } catch {}
		}
		try {
			if (element && element.addEventListener) {
				element.addEventListener('animationend', finish, { once: true });
				element.addEventListener('animationcancel', finish, { once: true });
			}
		} catch {}
		window.setTimeout(finish, Math.max(0, Number(fallbackMs) || 0));
	}

	// Projekter -> Om mig: RIGHT page turns to the LEFT (full 180°, no snaps).
	(function initProjectsToAboutFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/projects.html') && !path.endsWith('projects.html')) return;
		} catch {
			return;
		}
		/* Preview-iframes / indlejret projects: ingen overlay-prewarm (rekursive iframes + dobbelt nav i menu). */
		if (mskSkipNestedProjectsBookInits()) return;

		const FLIP_MS = getPageFlipMs(5200); // matches CSS `--pageFlipMs`
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.projects-about-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'projects-about-transition';
				overlay.innerHTML = `
					<div class="projects-about-turn" aria-hidden="true">
						<div class="projects-about-under projects-about-under--left">
							<iframe class="projects-about-frame projects-about-frame--left projects-about-under-frame projects-about-under-frame--projects" src="projects.html?preview=1" title="Projekter (left)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="projects-about-under projects-about-under--right">
							<iframe class="projects-about-frame projects-about-frame--right projects-about-under-frame projects-about-under-frame--projects" src="projects.html?preview=1" title="Projekter (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="projects-about-frame projects-about-frame--right projects-about-under-frame projects-about-under-frame--about" src="about.html?preview=1" title="Om mig (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="projects-about-turn__flip">
							<div class="projects-about-turn__flip-face projects-about-turn__flip-face--front">
								<iframe class="projects-about-frame projects-about-frame--right projects-about-turn__flip-front" src="projects.html?preview=1" title="Projekter (right turning sheet)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="projects-about-turn__flip-face projects-about-turn__flip-face--back">
								<iframe class="projects-about-frame projects-about-frame--left projects-about-turn__flip-back" src="about.html?preview=1" title="Om mig (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		// NOTE: we avoid cross-document style injection for previews (file:// can block it).
		// Instead, the iframe URLs include `?preview=1` and the page styles hide nav themselves.

		function prepOneFrame(fr) {
			try {
				if (!fr || !fr.contentDocument) return false;
				const doc = fr.contentDocument;
				// Make the preview pages hide nav/edge UI etc.
				// (CSS keys off `html.transition-preview`.)
				doc.documentElement.classList.add('transition-preview');
				// Back-compat with older selectors that might exist in some pages.
				doc.documentElement.classList.add('home-preview');
				doc.documentElement.classList.add('home-preview-reveal');
				fr.dataset.homePreviewReady = '1';
				return true;
			} catch {
				return false;
			}
		}

		function wireFramesOnce(overlay) {
			if (!overlay || overlay.dataset.framesWired === '1') return;
			overlay.dataset.framesWired = '1';
			const frames = Array.from(overlay.querySelectorAll('iframe'));
			frames.forEach((fr) => {
				// Mark loaded without relying on contentDocument access (file:// safe)
				try {
					fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
				} catch {}
				// If already loaded from cache, `load` may not fire again.
				try {
					const d = fr.contentDocument;
					if (d && (d.readyState === 'complete' || d.readyState === 'interactive')) {
						fr.classList.add('is-loaded');
					}
				} catch {}
				if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
			});
		}

		function watchSeamSwap(overlay) {
			let done = false;
			const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			const fallbackMs = Math.round(FLIP_MS * 0.5);

			function angleDegFromMatrix3d(transformStr) {
				try {
					const s = String(transformStr || '').trim();
					if (!s || s === 'none') return null;
					if (!s.startsWith('matrix3d(') || !s.endsWith(')')) return null;
					const nums = s.slice(9, -1).split(',').map((v) => Number(String(v).trim()));
					if (nums.length !== 16 || nums.some((n) => !Number.isFinite(n))) return null;
					const m11 = nums[0];
					const m31 = nums[8];
					const rad = Math.atan2(m31, m11);
					return (rad * 180) / Math.PI;
				} catch {
					return null;
				}
			}

			function tick() {
				if (done) return;
				if (!overlay || !overlay.classList || !overlay.classList.contains('is-turning')) return;
				try {
					const flipEl = overlay.querySelector('.projects-about-turn__flip');
					if (flipEl && window.getComputedStyle) {
						const tf = window.getComputedStyle(flipEl).transform;
						const ang = angleDegFromMatrix3d(tf);
						// Right page flips LEFT: 0 -> -180. Seam is -90deg.
						if (typeof ang === 'number' && ang <= -90) {
							overlay.classList.add('swap-flip-mid');
							done = true;
							return;
						}
					}
				} catch {}

				const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
				if ((now - startAt) >= fallbackMs) {
					try { overlay.classList.add('swap-flip-mid'); } catch {}
					done = true;
					return;
				}
				requestAnimationFrame(tick);
			}
			requestAnimationFrame(tick);
		}

		// Prewarm the overlay and iframes so "Om mig (left)" is already loaded
		// when the user clicks (prevents blank page at the seam).
		try {
			const pre = ensureOverlay();
			wireFramesOnce(pre);
		} catch {}

		function startFlipToAbout(targetHref) {
			const body = document.body;
			// Prevent double-starting while an existing flip is running.
			if (body.classList.contains('projects-about-flip-active')) return;

			body.classList.add('projects-about-flip-active');
			body.style.overflow = 'hidden';

			const overlay = ensureOverlay();
			wireFramesOnce(overlay);
			try { overlay.classList.remove('is-ready', 'is-turning', 'swap-under-right', 'swap-flip-mid'); } catch {}

			// Show overlay first (avoid a 1-frame blink), then start the flip.
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					try { overlay.classList.add('is-ready'); } catch {}
					requestAnimationFrame(() => {
						try { overlay.classList.add('is-turning'); } catch {}
						// Right under-page can switch immediately (it is covered by turning sheet early).
						try { overlay.classList.add('swap-under-right'); } catch {}
						// Seam: swap the FLIPPING page content exactly at 90deg.
						watchSeamSwap(overlay);
						// Safety fallback (in case transform can't be read).
						window.setTimeout(() => {
							try { overlay.classList.add('swap-flip-mid'); } catch {}
						}, Math.round(FLIP_MS * 0.5));
					});
				});
			});

			const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.projects-about-turn__flip') : null;
			navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			const hrefLower = hrefAttr.toLowerCase();
			if (!(hrefLower === 'about.html' || hrefLower.startsWith('about.html#') || hrefLower.startsWith('about.html?'))) return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			try { e.stopImmediatePropagation(); } catch {}
			startFlipToAbout(a.href);
		}, true);

		// Drag-to-turn from Projekter -> Om mig (corner pull).
		(function initProjectsToAboutDrag() {
			const DRAG_CLASS = 'projects-about-dragging';
			const COMPLETE_THRESHOLD = 0.5; // only commit after passing the middle
			const DRAG_PX = Math.max(260, Math.min(520, Math.round((mskViewportSize().w || window.innerWidth) * 0.38)));

			let handle = null;
			let dragging = false;
			let startX = 0;
			let progress = 0;
			let rafId = 0;

			function clamp01(x) { return Math.max(0, Math.min(1, x)); }

			function ensureHandle() {
				if (handle && document.body.contains(handle)) return handle;
				handle = document.createElement('div');
				handle.className = 'page-turn-handle page-turn-handle--right';
				handle.setAttribute('aria-hidden', 'true');
				document.body.appendChild(handle);
				return handle;
			}

			function setProgress(p, flipEl, overlay) {
				progress = clamp01(p);
				const angle = -180 * progress;
				try {
					if (flipEl) {
						flipEl.style.animation = 'none';
						flipEl.style.transition = 'none';
						flipEl.style.transform = `rotateY(${angle}deg)`;
					}
				} catch {}

				try {
					if (overlay) {
						if (progress > 0.02) overlay.classList.add('swap-under-right');
						else overlay.classList.remove('swap-under-right');
						if (progress >= 0.5) overlay.classList.add('swap-flip-mid');
						else overlay.classList.remove('swap-flip-mid');
					}
				} catch {}
			}

			function cleanupDragState(overlay, flipEl) {
				dragging = false;
				if (rafId) cancelAnimationFrame(rafId);
				rafId = 0;
				try { document.body.classList.remove(DRAG_CLASS, 'projects-about-flip-active'); } catch {}
				try { document.body.style.overflow = ''; } catch {}
				try {
					if (flipEl) {
						flipEl.style.transition = '';
						flipEl.style.animation = '';
						flipEl.style.transform = '';
					}
				} catch {}
				// Remove overlay if we cancelled.
				try { if (overlay && overlay.parentNode) overlay.remove(); } catch {}
			}

			function startDrag(e) {
				if (dragging) return;
				if (!e || e.button !== 0) return;
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();

				dragging = true;
				startX = e.clientX;

				const body = document.body;
				body.classList.add('projects-about-flip-active', DRAG_CLASS);
				body.style.overflow = 'hidden';

				// Always rebuild overlay (prevents stale markup).
				try {
					const old = document.querySelector('.projects-about-transition');
					if (old) old.remove();
				} catch {}

				const overlay = ensureOverlay();
				try { overlay.classList.add('is-ready', 'is-turning'); } catch {}
				const flipEl = overlay.querySelector('.projects-about-turn__flip');
				// Full-screen pointer catcher so we keep receiving move events even when the pointer
				// passes over iframes (without this, drag can "stop" around the middle).
				const catcher = document.createElement('div');
				catcher.setAttribute('aria-hidden', 'true');
				catcher.style.position = 'fixed';
				catcher.style.inset = '0';
				catcher.style.zIndex = '100000';
				catcher.style.background = 'transparent';
				catcher.style.pointerEvents = 'auto';
				catcher.style.touchAction = 'none';
				try { document.body.appendChild(catcher); } catch {}
				try { catcher.setPointerCapture && catcher.setPointerCapture(e.pointerId); } catch {}

				const frames = Array.from(overlay.querySelectorAll('iframe'));
				frames.forEach((fr) => {
					try { fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true }); } catch {}
					if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
				});

				// Start from 0 progress.
				requestAnimationFrame(() => {
					setProgress(0, flipEl, overlay);
				});

				function onMove(ev) {
					if (!dragging) return;
					const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : startX;
					const vw = mskViewportSize().w || window.innerWidth || 1;
					const seamX = vw * 0.5;

					// Right page to left: startX -> seam (0..0.5), then seam -> left edge (0.5..1)
					let p = 0;
					if (x >= startX) {
						p = 0;
					} else if (x >= seamX) {
						const denom = Math.max(1, (startX - seamX));
						p = ((startX - x) / denom) * 0.5;
					} else {
						p = 0.5 + ((seamX - x) / Math.max(1, seamX)) * 0.5;
					}
					if (!rafId) {
						rafId = requestAnimationFrame(() => {
							rafId = 0;
							setProgress(p, flipEl, overlay);
						});
					}
				}

				function onUp(ev) {
					try {
						if (ev) {
							ev.preventDefault();
							ev.stopPropagation();
						}
					} catch {}
					try { catcher.removeEventListener('pointermove', onMove, true); } catch {}
					try { catcher.removeEventListener('pointerup', onUp, true); } catch {}
					try { catcher.removeEventListener('pointercancel', onUp, true); } catch {}
					try {
						catcher.addEventListener(
							'click',
							(ce) => {
								try {
									ce.preventDefault();
									ce.stopPropagation();
								} catch {}
							},
							{ capture: true, once: true }
						);
					} catch {}
					window.setTimeout(() => {
						try { catcher.remove(); } catch {}
					}, 400);

					const shouldComplete = progress >= COMPLETE_THRESHOLD;
					if (!shouldComplete) {
						// Snap back
						try {
							if (flipEl) {
								flipEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
								flipEl.style.transform = 'rotateY(0deg)';
							}
						} catch {}
						window.setTimeout(() => cleanupDragState(overlay, flipEl), 280);
						return;
					}

					mskArmPageTurnGhostClickGuard(520);

					// Complete flip to end
					try {
						if (flipEl) {
							const ease = getPageFlipEase('cubic-bezier(.42,0,.58,1)');
							const remaining = Math.max(0, 1 - progress);
							const finishMs = Math.round(Math.max(420, Math.min(FLIP_MS, FLIP_MS * remaining)));
							flipEl.style.transition = `transform ${finishMs}ms ${ease}`;
							flipEl.style.transform = 'rotateY(-180deg)';
						}
					} catch {}
					// Navigate after the remaining motion finishes (avoids snap after the middle).
					window.setTimeout(() => {
						try { window.location.href = 'about.html'; } catch {}
					}, Math.round(Math.max(520, Math.min(FLIP_MS + 140, (FLIP_MS * (1 - progress)) + 260))));
				}

				// Bind to the catcher so moves continue over iframes.
				catcher.addEventListener('pointermove', onMove, true);
				catcher.addEventListener('pointerup', onUp, true);
				catcher.addEventListener('pointercancel', onUp, true);
			}

			// Add handle and bind pointerdown.
			const h = ensureHandle();
			try {
				h.addEventListener('pointerdown', (e) => {
					try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch {}
					startDrag(e);
				});
			} catch {}

		})();
	})();

	// Projekter -> Kontakt: flip the RIGHT page to the LEFT side.
	(function initProjectsToContactFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/projects.html') && !path.endsWith('projects.html')) return;
		} catch {
			return;
		}
		if (mskSkipNestedProjectsBookInits()) return;

		const FLIP_MS = getPageFlipMs(4200);
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.projects-contact-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'projects-contact-transition';
				overlay.innerHTML = `
					<div class="projects-contact-turn" aria-hidden="true">
						<div class="projects-contact-turn__under projects-contact-turn__under--left">
							<iframe class="projects-contact-turn__frame projects-contact-turn__frame--left projects-contact-turn__under-frame projects-contact-turn__under-frame--projects projects-contact-turn__page--projects" src="projects.html?preview=1" title="Projekter (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="projects-contact-turn__frame projects-contact-turn__frame--left projects-contact-turn__under-frame projects-contact-turn__under-frame--contact projects-contact-turn__page--contact" src="contact.html?preview=1" title="Kontakt (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="projects-contact-turn__under projects-contact-turn__under--right">
							<iframe class="projects-contact-turn__frame projects-contact-turn__frame--right projects-contact-turn__under-frame projects-contact-turn__under-frame--projects projects-contact-turn__page--projects" src="projects.html?preview=1" title="Projekter (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="projects-contact-turn__frame projects-contact-turn__frame--right projects-contact-turn__under-frame projects-contact-turn__under-frame--contact projects-contact-turn__page--contact" src="contact.html?preview=1" title="Kontakt (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="projects-contact-turn__flip">
							<div class="projects-contact-turn__flip-face projects-contact-turn__flip-face--front">
								<!-- Swap DESIGN on the FLIPPING page (same pattern as Kontakt -> Om mig) -->
								<iframe class="projects-contact-turn__frame projects-contact-turn__frame--right projects-contact-turn__flip-front projects-contact-turn__flip-front--projects projects-contact-turn__page--projects" src="projects.html?preview=1" title="Projekter (right on turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<iframe class="projects-contact-turn__frame projects-contact-turn__frame--left projects-contact-turn__flip-front projects-contact-turn__flip-front--contact projects-contact-turn__page--contact" src="contact.html?preview=1" title="Kontakt (left on turning page after swap)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="projects-contact-turn__flip-face projects-contact-turn__flip-face--back">
								<iframe class="projects-contact-turn__frame projects-contact-turn__frame--left projects-contact-turn__flip-back projects-contact-turn__page--contact" src="contact.html?preview=1" title="Kontakt (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startFlipToContact(targetHref) {
			const body = document.body;
			if (body.classList.contains('projects-contact-flipping') || document.querySelector('.projects-contact-transition')) return;

			try {
				const old = document.querySelector('.projects-contact-transition');
				if (old) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			try {
				const frames = Array.from(overlay.querySelectorAll('iframe'));
				frames.forEach((fr) => {
					fr.classList.remove('is-loaded');
					fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
					// If already loaded from cache, `load` may not fire again.
					try {
						const d = fr.contentDocument;
						if (d && (d.readyState === 'complete' || d.readyState === 'interactive')) {
							fr.classList.add('is-loaded');
						}
					} catch {}
				});
			} catch {}
			overlay.classList.remove('is-ready', 'is-turning', 'swap-under-left', 'swap-under-right', 'swap-flip-mid');

			// Show overlay first (prevents 1-frame blink), then hide the real page.
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					overlay.classList.add('is-ready');
					body.classList.add('projects-contact-flip-active');
					body.classList.add('projects-contact-flipping');
					body.style.overflow = 'hidden';

					requestAnimationFrame(() => overlay.classList.add('is-turning'));

					// Match the other flips: the turning sheet switches exactly at the seam (50%).
					// Before 50%: show Projekter RIGHT on the turning sheet.
					// After 50%: show Kontakt LEFT on the turning sheet, and reveal Kontakt-left underneath.
					const seamMs = Math.round(FLIP_MS * 0.5);
					window.setTimeout(() => overlay.classList.add('swap-flip-mid'), seamMs);
					window.setTimeout(() => overlay.classList.add('swap-under-left'), seamMs);

					const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.projects-contact-turn__flip') : null;
					navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
				});
			});
		}

		// Projekter -> Kontakt (MENU): double flip
		// Flip #1 reveals Om mig spread. Flip #2 reveals Kontakt spread. Then navigate.
		function ensureDoubleOverlay() {
			let overlay = document.querySelector('.projects-contact-double-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'projects-contact-double-transition';
				overlay.innerHTML = `
					<div class="pcd-turn" aria-hidden="true">
						<div class="pcd-under pcd-under--left">
							<iframe class="pcd-frame pcd-frame--left pcd-under-frame pcd-under-left--projects" src="projects.html?preview=1" title="Projekter (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="pcd-frame pcd-frame--left pcd-under-frame pcd-under-left--about" src="about.html?preview=1" title="Om mig (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="pcd-frame pcd-frame--left pcd-under-frame pcd-under-left--contact" src="contact.html?preview=1" title="Kontakt (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="pcd-under pcd-under--right">
							<iframe class="pcd-frame pcd-frame--right pcd-under-frame pcd-under-right--projects" src="projects.html?preview=1" title="Projekter (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="pcd-frame pcd-frame--right pcd-under-frame pcd-under-right--about" src="about.html?preview=1" title="Om mig (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="pcd-frame pcd-frame--right pcd-under-frame pcd-under-right--contact" src="contact.html?preview=1" title="Kontakt (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="pcd-flip pcd-flip--1">
							<div class="pcd-flip-face pcd-flip-face--front">
								<iframe class="pcd-frame pcd-frame--right pcd-flip-front pcd-flip1-front--projects" src="projects.html?preview=1" title="Projekter (right turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<iframe class="pcd-frame pcd-frame--left pcd-flip-front pcd-flip1-front--about" src="about.html?preview=1" title="Om mig (left turning page after mid)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="pcd-flip-face pcd-flip-face--back">
								<iframe class="pcd-frame pcd-frame--left pcd-flip-back pcd-flip1-back--about" src="about.html?preview=1" title="Om mig (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>

						<div class="pcd-flip pcd-flip--2">
							<div class="pcd-flip-face pcd-flip-face--front">
								<iframe class="pcd-frame pcd-frame--right pcd-flip-front pcd-flip2-front--about" src="about.html?preview=1" title="Om mig (right turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<iframe class="pcd-frame pcd-frame--left pcd-flip-front pcd-flip2-front--contact" src="contact.html?preview=1" title="Kontakt (left turning page after mid)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="pcd-flip-face pcd-flip-face--back">
								<iframe class="pcd-frame pcd-frame--left pcd-flip-back pcd-flip2-back--contact" src="contact.html?preview=1" title="Kontakt (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startDoubleFlipToContact(targetHref) {
			const body = document.body;
			if (body.classList.contains('projects-contact-flipping')) return;
			const existing = document.querySelector('.projects-contact-double-transition');
			if (existing && !existing.classList.contains('is-preloading')) return;

			try {
				const old = document.querySelector('.projects-contact-double-transition');
				// If we're preloading, reuse the overlay instead of removing it.
				if (old && !old.classList.contains('is-preloading')) old.remove();
			} catch {}

			const overlay = ensureDoubleOverlay();
			try { overlay.classList.remove('is-ready', 'stage-1', 'stage-2', 'is-turning-1', 'is-turning-2', 'swap1-mid', 'swap2-mid'); } catch {}
			try { overlay.classList.remove('is-preloading'); } catch {}

			// Match JS fallback timers to this overlay's speed.
			const DOUBLE_MS = getCssVarMsFromEl(overlay, '--pageFlipMs', FLIP_MS);

			const flip1 = overlay.querySelector('.pcd-flip--1');
			const flip2 = overlay.querySelector('.pcd-flip--2');
			// Mark iframes as loaded (helps avoid a white/blank paint at mid).
			try {
				const frames = Array.from(overlay.querySelectorAll('iframe'));
				frames.forEach((fr) => {
					try {
						// Don't clear `is-loaded` here; we rely on preloading to avoid 1-frame blanks.
						fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
						// If already in cache, `load` may not fire again.
						try {
							const d = fr.contentDocument;
							if (d && (d.readyState === 'complete' || d.readyState === 'interactive')) {
								fr.classList.add('is-loaded');
							}
						} catch {}
					} catch {}
				});
			} catch {}

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					// Stage 1 must be set before showing overlay (it controls which under pages display).
					try { overlay.classList.add('stage-1'); } catch {}

					// Show overlay immediately.
					try {
						overlay.classList.add('is-ready');
						overlay.style.transition = 'none';
						overlay.style.opacity = '1';
						void overlay.offsetHeight;
					} catch {}

					// Next frame: hide real page and start flip.
					requestAnimationFrame(() => {
						body.classList.add('projects-contact-double-active');
						body.classList.add('projects-contact-flipping');
						body.style.overflow = 'hidden';
						try { overlay.classList.add('is-turning-1'); } catch {}
						try { overlay.classList.add('swap1-under-right'); } catch {}
					});

					// Flip #1: swap at the middle seam (matches the drag feel).
					// For a right-page flipping LEFT, the seam is at rotateY(-90deg).
					(function scheduleFlip1MidSwapOnce() {
						let scheduled = false;
						function scheduleFromAnimationStart() {
							if (scheduled) return;
							scheduled = true;
							let done = false;
							const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
							const fallbackMs = Math.round(DOUBLE_MS * 0.5) + 40;
							function tick() {
								if (done) return;
								try {
									if (flip1 && window.getComputedStyle) {
										const ang = angleDegFromMatrix3d(window.getComputedStyle(flip1).transform);
										// 0 -> -180, seam at -90.
										if (typeof ang === 'number' && ang <= -90) {
											try { overlay.classList.add('swap1-mid'); } catch {}
											done = true;
											return;
										}
									}
								} catch {}
								const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
								if ((now - startAt) >= fallbackMs) {
									try { overlay.classList.add('swap1-mid'); } catch {}
									done = true;
									return;
								}
								requestAnimationFrame(tick);
							}
							requestAnimationFrame(tick);
						}
						try {
							if (flip1 && flip1.addEventListener) {
								flip1.addEventListener('animationstart', scheduleFromAnimationStart, { once: true });
							}
						} catch {}
						// Fallback: if animationstart doesn't fire, begin watching shortly after.
						window.setTimeout(() => { if (!scheduled) scheduleFromAnimationStart(); }, 140);
					})();

					function startSecondFlip() {
						try {
							overlay.classList.remove('stage-1', 'is-turning-1', 'swap1-mid', 'swap1-under-right');
							overlay.classList.add('stage-2', 'is-turning-2');
						} catch {}
						// Flip #2: swap the RIGHT under-page immediately at flip start (prevents a snap).
						try { overlay.classList.add('swap2-under-right'); } catch {}
						// Flip #2: swap at the middle seam (matches the drag feel).
						(function scheduleFlip2MidSwapOnce() {
							let scheduled = false;
							function scheduleFromAnimationStart() {
								if (scheduled) return;
								scheduled = true;
								let done = false;
								const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
								const fallbackMs = Math.round(DOUBLE_MS * 0.5) + 40;
								function tick() {
									if (done) return;
									try {
										if (flip2 && window.getComputedStyle) {
											const ang = angleDegFromMatrix3d(window.getComputedStyle(flip2).transform);
											// 0 -> -180, seam at -90.
											if (typeof ang === 'number' && ang <= -90) {
												try { overlay.classList.add('swap2-mid'); } catch {}
												done = true;
												return;
											}
										}
									} catch {}
									const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
									if ((now - startAt) >= fallbackMs) {
										try { overlay.classList.add('swap2-mid'); } catch {}
										done = true;
										return;
									}
									requestAnimationFrame(tick);
								}
								requestAnimationFrame(tick);
							}
							try {
								if (flip2 && flip2.addEventListener) {
									flip2.addEventListener('animationstart', scheduleFromAnimationStart, { once: true });
								}
							} catch {}
							window.setTimeout(() => { if (!scheduled) scheduleFromAnimationStart(); }, 140);
						})();
						navigateAfterFlip({ element: flip2, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
					}

					try {
						if (flip1 && flip1.addEventListener) {
							flip1.addEventListener('animationend', startSecondFlip, { once: true });
						} else {
							window.setTimeout(startSecondFlip, DOUBLE_MS + 120);
						}
					} catch {
						window.setTimeout(startSecondFlip, DOUBLE_MS + 120);
					}

					// Hard fallback: start second flip even if animation events fail.
					window.setTimeout(() => {
						try { if (!overlay.classList.contains('stage-2')) startSecondFlip(); } catch {}
					}, DOUBLE_MS + 260);
				});
			});
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'contact.html') return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startDoubleFlipToContact(a.href);
		}, true);

		// Preload the double overlay (and its iframes) so the 2nd-half backface isn't blank.
		(function preloadDoubleOnce() {
			try {
				if (document.documentElement.classList.contains('transition-preview')) return;
				const ov = ensureDoubleOverlay();
				ov.classList.add('is-preloading');
			} catch {}
		})();
	})();

	// Om mig -> Projekter: flip the LEFT page to the RIGHT side.
	(function initAboutToProjectsFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/about.html') && !path.endsWith('about.html')) return;
		} catch {
			return;
		}

		const FLIP_MS = getPageFlipMs(4200);
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.about-projects-transition');
			// If an old preloaded overlay exists from a previous version, rebuild it.
			try {
				if (overlay && !overlay.querySelector('.about-projects-turn__flip-backface')) {
					overlay.remove();
					overlay = null;
				}
			} catch {}
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'about-projects-transition';
				overlay.innerHTML = `
					<div class="about-projects-turn" aria-hidden="true">
						<div class="about-projects-turn__under about-projects-turn__under--left">
							<iframe class="about-projects-turn__frame about-projects-turn__frame--left about-projects-turn__under-frame about-projects-turn__under-frame--about" src="about.html?preview=1" title="Om mig (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="about-projects-turn__frame about-projects-turn__frame--left about-projects-turn__under-frame about-projects-turn__under-frame--projects" src="projects.html?preview=1" title="Projekter (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="about-projects-turn__under about-projects-turn__under--right">
							<iframe class="about-projects-turn__frame about-projects-turn__frame--right about-projects-turn__under-frame about-projects-turn__under-frame--about" src="about.html?preview=1" title="Om mig (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="about-projects-turn__frame about-projects-turn__frame--right about-projects-turn__under-frame about-projects-turn__under-frame--projects" src="projects.html?preview=1" title="Projekter (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="about-projects-turn__flip">
							<div class="about-projects-turn__flip-face about-projects-turn__flip-face--front">
								<!-- Swap DESIGN on the FLIPPING page at mid (50%): About LEFT -> Projects RIGHT -->
								<div class="about-projects-turn__flip-surface about-projects-turn__flip-surface--about">
									<iframe class="about-projects-turn__frame about-projects-turn__frame--left about-projects-turn__flip-front about-projects-turn__flip-front--about" src="about.html?preview=1" title="Om mig (left on turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								</div>
								<div class="about-projects-turn__flip-surface about-projects-turn__flip-surface--projects">
									<iframe class="about-projects-turn__frame about-projects-turn__frame--projects-right-on-flip about-projects-turn__flip-front about-projects-turn__flip-front--projects" src="projects.html?preview=1" title="Projekter (right page on turning sheet after seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								</div>
							</div>
							<div class="about-projects-turn__flip-face about-projects-turn__flip-face--back">
								<iframe class="about-projects-turn__frame about-projects-turn__frame--projects-right-on-flip" src="projects.html?preview=1" title="Projekter (right page on flipped side)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<!-- Dedicated backface layer: keeps Projects RIGHT visible after mid (Safari-safe) -->
							<div class="about-projects-turn__flip-backface" aria-hidden="true">
								<iframe class="about-projects-turn__frame about-projects-turn__frame--projects-right-on-flip about-projects-turn__flip-backface-frame" src="projects.html?preview=1" title="Projekter (right page backface layer)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function prepOneFrame(fr) {
			try {
				if (!fr || !fr.contentDocument) return false;
				const doc = fr.contentDocument;
				doc.documentElement.classList.add('home-preview');
				doc.documentElement.classList.add('home-preview-reveal');
				fr.dataset.homePreviewReady = '1';
				// If we can access the document, it's same-origin. Mark as loaded
				// when readyState indicates it's already painted, so CSS opacity gates don't stay at 0.
				try {
					const rs = doc.readyState;
					if (rs && rs !== 'loading') fr.classList.add('is-loaded');
				} catch {}
				return true;
			} catch {
				return false;
			}
		}

		function markLoadedIfReady(fr) {
			try {
				if (!fr || fr.classList.contains('is-loaded')) return;
				const doc = fr.contentDocument;
				if (!doc) return;
				const rs = doc.readyState;
				if (rs && rs !== 'loading') fr.classList.add('is-loaded');
			} catch {}
		}

		function ensureLoadedSoon(fr, maxMs = 1800) {
			try {
				if (!fr || fr.classList.contains('is-loaded')) return;
				const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
				const tick = () => {
					try { markLoadedIfReady(fr); } catch {}
					if (fr.classList.contains('is-loaded')) return;
					const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					if ((now - startAt) >= maxMs) return;
					requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			} catch {}
		}

		function startFlipToProjects(targetHref) {
			const body = document.body;
			if (body.classList.contains('about-projects-flipping')) return;
			const existing = document.querySelector('.about-projects-transition');
			if (existing && !existing.classList.contains('is-preloading')) return;

			try {
				const old = document.querySelector('.about-projects-transition');
				// If we're preloading, reuse the overlay instead of removing it.
				if (old && !old.classList.contains('is-preloading')) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			overlay.classList.remove('swap-under-right', 'swap-under-left', 'swap-flip-mid');
			try { overlay.classList.remove('is-preloading'); } catch {}
			const frames = Array.from(overlay.querySelectorAll('iframe'));
			frames.forEach((fr) => {
				// If the iframe is already loaded (common when we preloaded the overlay),
				// mark it immediately so the turning sheet isn't blank in the 2nd half.
				markLoadedIfReady(fr);
				// And keep polling briefly, because preloaded iframes can miss the `load` event handler.
				ensureLoadedSoon(fr, 2200);
				// Always mark as loaded on iframe load (works even if contentDocument access is blocked).
				try {
					fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
				} catch {}
				if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
			});
			// We rely on CSS paper fallbacks while iframes load (no blank flashes),
			// so we can always swap to the Projekter design at the right time.
			const underLeftProjects = overlay.querySelector('.about-projects-turn__under--left .about-projects-turn__under-frame--projects');
			try {
				if (underLeftProjects) {
					// If preloaded, the load event may have already fired.
					markLoadedIfReady(underLeftProjects);
					ensureLoadedSoon(underLeftProjects, 2200);
					if (underLeftProjects.classList.contains('is-loaded')) overlay.classList.add('swap-under-left-ready');
					underLeftProjects.addEventListener('load', () => overlay.classList.add('swap-under-left-ready'), { once: true });
				}
			} catch {}

			// IMPORTANT: avoid a 1-frame "blank" by showing overlay first,
			// then hiding the real page.
			body.classList.remove('about-projects-flip-half');
			overlay.classList.remove('is-turning', 'swap-under-right');

			requestAnimationFrame(() => {
				// Show overlay first (avoid any "nothing visible" frame), then hide the real page.
				overlay.classList.add('is-ready');

				requestAnimationFrame(() => {
					body.classList.add('about-projects-flip-active');
					body.classList.add('about-projects-flipping');
					body.style.overflow = 'hidden';

					overlay.classList.add('is-turning');
					// Timing tune (menu click): swap a bit AFTER the visual seam,
					// but once it appears it must stay on for the rest of the flip.
					const SWAP_FRAC = 0.58;
					const SWAP_DEG = 105; // seam=90deg, slightly after
					// Swap the FLIPPING page design at the visual seam (middle),
					// so the 2nd half of the turning sheet shows Projekter RIGHT.
					// Venstre under-side (Projekter) skal først vises her — ikke ved flip-start.
					(function scheduleMidSwap() {
						let done = false;
						function applySeamSwap() {
							overlay.classList.add('swap-flip-mid', 'swap-under-left');
						}
						const flipEl = overlay.querySelector('.about-projects-turn__flip');
						if (!flipEl) {
							window.setTimeout(() => applySeamSwap(), Math.round(FLIP_MS * SWAP_FRAC));
							return;
						}
						const startWatcher = () => {
							const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
							const fallbackMs = Math.round(FLIP_MS * SWAP_FRAC) + 80;
							const tick = () => {
								if (done) return;
								try {
									const ang = angleDegFromMatrix3d(window.getComputedStyle(flipEl).transform);
									// CSS rotateY can report +/- degrees depending on matrix convention.
									// Trigger after the seam once we reach ~105deg in either direction.
									if (typeof ang === 'number' && Math.abs(ang) >= SWAP_DEG) {
										done = true;
										applySeamSwap();
										return;
									}
								} catch {}
								const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
								if ((now - startAt) >= fallbackMs) {
									done = true;
									applySeamSwap();
									return;
								}
								requestAnimationFrame(tick);
							};
							requestAnimationFrame(tick);
						};
						try {
							flipEl.addEventListener('animationstart', startWatcher, { once: true });
							// If `animationstart` is missed, start shortly after.
							window.setTimeout(() => { if (!done) startWatcher(); }, 120);
						} catch {
							window.setTimeout(() => applySeamSwap(), Math.round(FLIP_MS * SWAP_FRAC));
						}
					})();
					// Keep OM MIG visible on the RIGHT page until the turning sheet covers it.
					// Then swap the right under-page to Projekter.
					window.setTimeout(() => {
						overlay.classList.add('swap-under-right');
					}, Math.round(FLIP_MS * 0.88));
				});
			});

			// No mid-flip swap needed: both faces are Projekter right page.

			const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.about-projects-turn__flip') : null;
			navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'projects.html') return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startFlipToProjects(a.href);
		}, true);

		// Preload the overlay (and its iframes) to avoid a brief "no design" flash.
		(function preloadOnce() {
			try {
				if (document.documentElement.classList.contains('transition-preview')) return;
				const ov = ensureOverlay();
				ov.classList.add('is-preloading');
			} catch {}
		})();

		// Drag-to-turn (Om mig -> Projekter) from bottom-left corner.
		(function initAboutToProjectsDrag() {
			const DRAG_CLASS = 'about-projects-dragging';
			const COMPLETE_THRESHOLD = 0.5; // only commit after passing the middle
			// Venstre under-side: Projekter så snart træk starter. Vendende blad (swap-flip-mid): når "fold" når UDMÆRKELSER.
			const SWAP_MIN_PROGRESS = 0.02;
			const DRAG_PX = Math.max(260, Math.min(520, Math.round((mskViewportSize().w || window.innerWidth) * 0.38)));

			let handle = null;
			let dragging = false;
			let startX = 0;
			let progress = 0;
			let rafId = 0;

			function clamp01(x) { return Math.max(0, Math.min(1, x)); }
			function ensureHandle() {
				if (handle && document.body.contains(handle)) return handle;
				handle = document.createElement('div');
				handle.className = 'page-turn-handle page-turn-handle--left';
				handle.setAttribute('aria-hidden', 'true');
				document.body.appendChild(handle);
				return handle;
			}

			function udmaerkelserNavDesignSwapX(fallbackVw) {
				try {
					const a = document.querySelector('.navbar a[href*="#udmaerkelser"]');
					if (a) {
						const r = a.getBoundingClientRect();
						if (r.width > 0) {
							return (r.left + r.right) * 0.5;
						}
					}
				} catch {}
				return (typeof fallbackVw === 'number' ? fallbackVw : (mskViewportSize().w || window.innerWidth)) * 0.5;
			}

			function setProgress(p, x, seamX, flipEl, overlay) {
				progress = clamp01(p);
				const angle = 180 * progress;
				try {
					if (flipEl) {
						flipEl.style.animation = 'none';
						flipEl.style.transition = 'none';
						flipEl.style.transform = `rotateY(${angle}deg)`;
					}
				} catch {}

				try {
					if (overlay) {
						const vw = mskViewportSize().w || window.innerWidth || 1;
						const udmX = udmaerkelserNavDesignSwapX(vw);
						const hasX = (typeof x === 'number' && isFinite(x));
						const pastUdm = hasX && (x >= udmX) && (progress >= SWAP_MIN_PROGRESS);
						if (pastUdm) {
							overlay.classList.add('swap-flip-mid');
						} else {
							overlay.classList.remove('swap-flip-mid');
						}

						if (progress >= 0.88) overlay.classList.add('swap-under-right');
						else overlay.classList.remove('swap-under-right');
					}
				} catch {}
			}

			function cleanup(overlay, flipEl) {
				dragging = false;
				if (rafId) cancelAnimationFrame(rafId);
				rafId = 0;
				try { document.body.classList.remove(DRAG_CLASS, 'about-projects-flip-active', 'about-projects-flipping'); } catch {}
				try { document.body.style.overflow = ''; } catch {}
				try { if (overlay && overlay.parentNode) overlay.remove(); } catch {}
				try {
					if (flipEl) {
						flipEl.style.transition = '';
						flipEl.style.animation = '';
						flipEl.style.transform = '';
					}
				} catch {}
			}

			function startDrag(e) {
				if (dragging) return;
				if (!e || e.button !== 0) return;
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();

				dragging = true;
				startX = e.clientX;

				const body = document.body;
				body.classList.add('about-projects-flip-active', 'about-projects-flipping', DRAG_CLASS);
				body.style.overflow = 'hidden';

				try {
					const old = document.querySelector('.about-projects-transition');
					if (old) old.remove();
				} catch {}

				const overlay = ensureOverlay();
				try { overlay.classList.remove('swap-flip-mid', 'swap-under-right'); } catch {}
				overlay.classList.add('is-ready', 'is-turning', 'swap-under-left');
				// Ensure we mark frames as loaded during drag too (so CSS can fade them in).
				try {
					const frames = Array.from(overlay.querySelectorAll('iframe'));
					frames.forEach((fr) => {
						try { fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true }); } catch {}
						if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
					});
				} catch {}
				const flipEl = overlay.querySelector('.about-projects-turn__flip');

				function onMove(ev) {
					if (!dragging) return;
					const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : startX;
					const vw = mskViewportSize().w || window.innerWidth || 1;
					const seamX = vw * 0.5;

					// Match Projects -> About drag distance:
					// startX -> seam (0..0.5), then seam -> right edge (0.5..1)
					let p = 0;
					if (x <= startX) {
						p = 0;
					} else if (x <= seamX) {
						const denom = Math.max(1, (seamX - startX));
						p = ((x - startX) / denom) * 0.5;
					} else {
						p = 0.5 + ((x - seamX) / Math.max(1, (vw - seamX))) * 0.5;
					}
					if (!rafId) {
						rafId = requestAnimationFrame(() => {
							rafId = 0;
							setProgress(p, x, seamX, flipEl, overlay);
						});
					}
				}

				function onUp(ev) {
					try {
						if (ev) {
							ev.preventDefault();
							ev.stopPropagation();
						}
					} catch {}
					window.removeEventListener('pointermove', onMove, true);
					window.removeEventListener('pointerup', onUp, true);
					window.removeEventListener('pointercancel', onUp, true);

					const shouldComplete = progress >= COMPLETE_THRESHOLD;
					if (!shouldComplete) {
						try {
							if (flipEl) {
								flipEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
								flipEl.style.transform = 'rotateY(0deg)';
							}
						} catch {}
						window.setTimeout(() => cleanup(overlay, flipEl), 280);
						return;
					}

					mskArmPageTurnGhostClickGuard(520);

					try {
						if (flipEl) {
							const ease = getPageFlipEase('cubic-bezier(.42,0,.58,1)');
							const remaining = Math.max(0, 1 - progress);
							const finishMs = Math.round(Math.max(420, Math.min(FLIP_MS, FLIP_MS * remaining)));
							flipEl.style.transition = `transform ${finishMs}ms ${ease}`;
							flipEl.style.transform = 'rotateY(180deg)';
						}
						overlay.classList.add('swap-under-right');
						// Ensure the flipping page design is swapped once we're committed past the middle.
						overlay.classList.add('swap-flip-mid');
					} catch {}
					window.setTimeout(() => { window.location.href = 'projects.html'; }, Math.round(Math.max(520, Math.min(FLIP_MS + 140, (FLIP_MS * (1 - progress)) + 260))));
				}

				window.addEventListener('pointermove', onMove, true);
				window.addEventListener('pointerup', onUp, true);
				window.addEventListener('pointercancel', onUp, true);
			}

			const h = ensureHandle();
			try {
				h.addEventListener('pointerdown', (e) => {
					try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch {}
					startDrag(e);
				});
			} catch {}
		})();
	})();

	// Om mig -> Kontakt: flip the RIGHT page to the LEFT side (same movement as other page turns).
	(function initAboutToContactFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/about.html') && !path.endsWith('about.html')) return;
		} catch {
			return;
		}

		const FLIP_MS = getPageFlipMs(4200);
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.about-contact-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'about-contact-transition';
				overlay.innerHTML = `
					<div class="about-contact-turn" aria-hidden="true">
						<div class="about-contact-turn__under about-contact-turn__under--left">
							<iframe class="about-contact-turn__frame about-contact-turn__frame--left about-contact-turn__under-frame about-contact-turn__under-frame--about" src="about.html?preview=1" title="Om mig (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="about-contact-turn__frame about-contact-turn__frame--left about-contact-turn__under-frame about-contact-turn__under-frame--contact" src="contact.html?preview=1" title="Kontakt (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="about-contact-turn__under about-contact-turn__under--right">
							<iframe class="about-contact-turn__frame about-contact-turn__frame--right about-contact-turn__under-frame about-contact-turn__under-frame--about" src="about.html?preview=1" title="Om mig (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="about-contact-turn__frame about-contact-turn__frame--right about-contact-turn__under-frame about-contact-turn__under-frame--contact" src="contact.html?preview=1" title="Kontakt (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="about-contact-turn__flip">
							<div class="about-contact-turn__flip-face about-contact-turn__flip-face--front">
								<!-- Front of turning sheet: Om mig RIGHT page -->
								<iframe class="about-contact-turn__frame about-contact-turn__frame--right about-contact-turn__flip-front about-contact-turn__flip-front--about" src="about.html?preview=1" title="Om mig (right on turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<!-- Safety swap: after mid, force Kontakt LEFT design on the turning sheet (matches Projekter -> Kontakt pattern) -->
								<iframe class="about-contact-turn__frame about-contact-turn__frame--left about-contact-turn__flip-front about-contact-turn__flip-front--contact" src="contact.html?preview=1" title="Kontakt (left on turning page after seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="about-contact-turn__flip-face about-contact-turn__flip-face--back">
								<iframe class="about-contact-turn__frame about-contact-turn__frame--left about-contact-turn__flip-back" src="contact.html?preview=1" title="Kontakt (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startFlipToContact(targetHref) {
			const body = document.body;
			if (body.classList.contains('about-contact-flipping')) return;
			const existing = document.querySelector('.about-contact-transition');
			if (existing && !existing.classList.contains('is-preloading')) return;

			try {
				const old = document.querySelector('.about-contact-transition');
				// If we're preloading, reuse the overlay instead of removing it.
				if (old && !old.classList.contains('is-preloading')) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			overlay.classList.remove('swap-under-right', 'swap-under-left', 'swap-flip-mid');
			try { overlay.classList.remove('is-preloading'); } catch {}

			// Make overlay visible BEFORE hiding the current page (prevents a 1-frame blank flash).
			try { overlay.classList.add('is-ready'); } catch {}

			body.classList.add('about-contact-flip-active');
			body.classList.add('about-contact-flipping');
			body.style.overflow = 'hidden';

			// Show overlay before hiding the page to avoid a blink.
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					overlay.classList.add('is-ready');
					requestAnimationFrame(() => {
						overlay.classList.add('is-turning');
					});
				});
			});

			// As soon as the flip begins, the right side is covered, so we can swap it underneath.
			window.setTimeout(() => {
				overlay.classList.add('swap-under-right');
			}, 60);

			// Seam swap MUST match the real 90deg seam (easing makes time-based 50% snap).
			(function watchSeamOnce() {
				let done = false;
				let turningStartedAt = null;
				// Delay the visible swap slightly AFTER the middle for a smoother read.
				const fallbackMs = Math.round(FLIP_MS * 0.58) + 28;
				function tick() {
					if (done) return;
					// The watcher can start before `.is-turning` is applied (menu click path).
					// Keep polling until the flip actually starts, otherwise we never swap.
					if (!overlay.classList.contains('is-turning')) {
						requestAnimationFrame(tick);
						return;
					}
					try {
						if (turningStartedAt == null) {
							turningStartedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
						}
						const flipEl = overlay.querySelector('.about-contact-turn__flip');
						if (flipEl && window.getComputedStyle) {
							const ang = angleDegFromMatrix3d(window.getComputedStyle(flipEl).transform);
							// About -> Contact flips right page left: 0 -> -180, seam at -90.
							// Swap a little after the seam (<= -105deg) to avoid looking "too quick".
							if (typeof ang === 'number' && ang <= -105) {
								// Only swap the FLIPPING page design at the seam.
								// Keep the LEFT under-page as "Om mig" until it is covered by the turning sheet.
								overlay.classList.add('swap-flip-mid');
								done = true;
								return;
							}
						}
					} catch {}
					const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					const base = (turningStartedAt == null) ? now : turningStartedAt;
					if ((now - base) >= fallbackMs) {
						try { overlay.classList.add('swap-flip-mid'); } catch {}
						done = true;
						return;
					}
					requestAnimationFrame(tick);
				}
				requestAnimationFrame(tick);
			})();

			// Swap the LEFT under-page very late (only after it's fully covered).
			(function watchLateUnderLeftOnce() {
				let done = false;
				let turningStartedAt = null;
				// Near the end of the turn. This is intentionally late to avoid showing Kontakt underneath too early.
				const fallbackMs = Math.round(FLIP_MS * 0.90);
				function tick() {
					if (done) return;
					if (!overlay.classList.contains('is-turning')) {
						requestAnimationFrame(tick);
						return;
					}
					try {
						if (turningStartedAt == null) {
							turningStartedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
						}
						const flipEl = overlay.querySelector('.about-contact-turn__flip');
						if (flipEl && window.getComputedStyle) {
							const ang = angleDegFromMatrix3d(window.getComputedStyle(flipEl).transform);
							// Close to fully turned (covered).
							if (typeof ang === 'number' && ang <= -165) {
								overlay.classList.add('swap-under-left');
								done = true;
								return;
							}
						}
					} catch {}
					const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					const base = (turningStartedAt == null) ? now : turningStartedAt;
					if ((now - base) >= fallbackMs) {
						try { overlay.classList.add('swap-under-left'); } catch {}
						done = true;
						return;
					}
					requestAnimationFrame(tick);
				}
				requestAnimationFrame(tick);
			})();

			const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.about-contact-turn__flip') : null;
			navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'contact.html') return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startFlipToContact(a.href);
		}, true);

		// Preload the overlay (and its iframes) to avoid a brief "no design" flash.
		(function preloadOnce() {
			try {
				if (document.documentElement.classList.contains('transition-preview')) return;
				const ov = ensureOverlay();
				ov.classList.add('is-preloading');
			} catch {}
		})();

		// Drag-to-turn (Om mig -> Kontakt) from bottom-right corner.
		(function initAboutToContactDrag() {
			const DRAG_CLASS = 'about-contact-dragging';
			const COMPLETE_THRESHOLD = 0.5; // only commit after passing the middle
			const DRAG_PX = Math.max(260, Math.min(520, Math.round((mskViewportSize().w || window.innerWidth) * 0.38)));

			let handle = null;
			let dragging = false;
			let startX = 0;
			let progress = 0;
			let rafId = 0;

			function clamp01(x) { return Math.max(0, Math.min(1, x)); }
			function ensureHandle() {
				if (handle && document.body.contains(handle)) return handle;
				handle = document.createElement('div');
				handle.className = 'page-turn-handle page-turn-handle--right';
				handle.setAttribute('aria-hidden', 'true');
				document.body.appendChild(handle);
				return handle;
			}

			function setProgress(p, x, seamX, flipEl, overlay) {
				progress = clamp01(p);
				const angle = -180 * progress;
				try {
					if (flipEl) {
						flipEl.style.animation = 'none';
						flipEl.style.transition = 'none';
						flipEl.style.transform = `rotateY(${angle}deg)`;
					}
				} catch {}

				try {
					if (overlay) {
						// Right under-page can switch immediately (it's covered by the turning sheet early).
						if (progress > 0.02) overlay.classList.add('swap-under-right');
						else overlay.classList.remove('swap-under-right');

						// Flipping sheet: swap exactly at the middle seam while dragging.
						// For a RIGHT->LEFT drag, "past middle" means cursor has crossed to the left side of the seam.
						const cursorPastMiddle = (typeof x === 'number' && typeof seamX === 'number') ? (x <= seamX) : (progress >= 0.5);
						if (progress >= 0.5 && cursorPastMiddle) overlay.classList.add('swap-flip-mid');
						else overlay.classList.remove('swap-flip-mid');

						// Left under-page should stay "Om mig" until it's covered by the turning sheet.
						// So swap very late.
						if (progress >= 0.92) overlay.classList.add('swap-under-left');
						else overlay.classList.remove('swap-under-left');

					}
				} catch {}
			}

			function cleanup(overlay, flipEl) {
				dragging = false;
				if (rafId) cancelAnimationFrame(rafId);
				rafId = 0;
				try { document.body.classList.remove(DRAG_CLASS, 'about-contact-flip-active', 'about-contact-flipping'); } catch {}
				try { document.body.style.overflow = ''; } catch {}
				try { if (overlay && overlay.parentNode) overlay.remove(); } catch {}
				try {
					if (flipEl) {
						flipEl.style.transition = '';
						flipEl.style.animation = '';
						flipEl.style.transform = '';
					}
				} catch {}
			}

			function startDrag(e) {
				if (dragging) return;
				if (!e || e.button !== 0) return;
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();

				dragging = true;
				startX = e.clientX;

				const body = document.body;
				body.classList.add('about-contact-flip-active', 'about-contact-flipping', DRAG_CLASS);
				body.style.overflow = 'hidden';

				try {
					const old = document.querySelector('.about-contact-transition');
					if (old) old.remove();
				} catch {}

				const overlay = ensureOverlay();
				overlay.classList.add('is-ready', 'is-turning');
				const flipEl = overlay.querySelector('.about-contact-turn__flip');

				function onMove(ev) {
					if (!dragging) return;
					const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : startX;
					const vw = mskViewportSize().w || window.innerWidth || 1;
					const seamX = vw * 0.5;

					// Map drag distance to seam-aware progress:
					// startX -> seam = 0..0.5, seam -> left edge = 0.5..1
					let p = 0;
					if (x >= startX) {
						p = 0;
					} else if (x >= seamX) {
						const denom = Math.max(1, (startX - seamX));
						p = ((startX - x) / denom) * 0.5;
					} else {
						p = 0.5 + ((seamX - x) / Math.max(1, seamX)) * 0.5;
					}
					if (!rafId) {
						rafId = requestAnimationFrame(() => {
							rafId = 0;
							setProgress(p, x, seamX, flipEl, overlay);
						});
					}
				}

				function onUp(ev) {
					try {
						if (ev) {
							ev.preventDefault();
							ev.stopPropagation();
						}
					} catch {}
					window.removeEventListener('pointermove', onMove, true);
					window.removeEventListener('pointerup', onUp, true);
					window.removeEventListener('pointercancel', onUp, true);

					const shouldComplete = progress >= COMPLETE_THRESHOLD;
					if (!shouldComplete) {
						try {
							if (flipEl) {
								flipEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
								flipEl.style.transform = 'rotateY(0deg)';
							}
						} catch {}
						window.setTimeout(() => cleanup(overlay, flipEl), 280);
						return;
					}

					mskArmPageTurnGhostClickGuard(520);

					let finishMs = 520;
					try {
						if (flipEl) {
							const ease = getPageFlipEase('cubic-bezier(.42,0,.58,1)');
							const remaining = Math.max(0, 1 - progress);
							finishMs = Math.round(Math.max(420, Math.min(FLIP_MS, FLIP_MS * remaining)));
							flipEl.style.transition = `transform ${finishMs}ms ${ease}`;
							flipEl.style.transform = 'rotateY(-180deg)';
						}
						overlay.classList.add('swap-under-right');

						// If the user releases right after passing the middle, we still need to swap the turning-sheet design
						// during the finishing animation (pointermove events stop after pointerup).
						const SWAP_P = 0.50; // exactly at the middle
						if (progress >= SWAP_P) {
							overlay.classList.add('swap-flip-mid');
						} else {
							const remainingP = Math.max(0.0001, 1 - progress);
							const untilSwapP = Math.max(0, SWAP_P - progress);
							const delayMs = Math.round(Math.max(0, Math.min(finishMs, finishMs * (untilSwapP / remainingP))));
							window.setTimeout(() => {
								try { overlay.classList.add('swap-flip-mid'); } catch {}
							}, delayMs);
						}

						// Keep the left under-page as Om mig until the sheet has covered it (swap very late).
						window.setTimeout(() => {
							try { overlay.classList.add('swap-under-left'); } catch {}
						}, Math.round(Math.max(0, finishMs - 40)));
					} catch {}
					window.setTimeout(() => { window.location.href = 'contact.html'; }, Math.round(Math.max(520, Math.min(FLIP_MS + 140, (FLIP_MS * (1 - progress)) + 260))));
				}

				window.addEventListener('pointermove', onMove, true);
				window.addEventListener('pointerup', onUp, true);
				window.addEventListener('pointercancel', onUp, true);
			}

			const h = ensureHandle();
			try {
				h.addEventListener('pointerdown', (e) => {
					try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch {}
					startDrag(e);
				});
			} catch {}
		})();
	})();

	// Kontakt -> Om mig: flip the LEFT page to the RIGHT side (reverse direction).
	(function initContactToAboutFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/contact.html') && !path.endsWith('contact.html')) return;
		} catch {
			return;
		}

		const FLIP_MS = getPageFlipMs(4200);
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.contact-about-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'contact-about-transition';
				overlay.innerHTML = `
					<div class="contact-about-turn" aria-hidden="true">
						<div class="contact-about-turn__under contact-about-turn__under--left">
							<iframe class="contact-about-turn__frame contact-about-turn__frame--left contact-about-turn__under-frame contact-about-turn__under-frame--contact" src="contact.html?preview=1" title="Kontakt (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="contact-about-turn__frame contact-about-turn__frame--left contact-about-turn__under-frame contact-about-turn__under-frame--about" src="about.html?preview=1" title="Om mig (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="contact-about-turn__under contact-about-turn__under--right">
							<iframe class="contact-about-turn__frame contact-about-turn__frame--right contact-about-turn__under-frame contact-about-turn__under-frame--contact" src="contact.html?preview=1" title="Kontakt (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="contact-about-turn__frame contact-about-turn__frame--right contact-about-turn__under-frame contact-about-turn__under-frame--about" src="about.html?preview=1" title="Om mig (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="contact-about-turn__flip">
							<div class="contact-about-turn__flip-face contact-about-turn__flip-face--front">
								<!-- Swap DESIGN on the FLIPPING page at mid (50%) -->
								<iframe class="contact-about-turn__frame contact-about-turn__frame--left contact-about-turn__flip-front contact-about-turn__flip-front--contact" src="contact.html?preview=1" title="Kontakt (left turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<iframe class="contact-about-turn__frame contact-about-turn__frame--right contact-about-turn__flip-front contact-about-turn__flip-front--about" src="about.html?preview=1" title="Om mig (right turning page after mid)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="contact-about-turn__flip-face contact-about-turn__flip-face--back">
								<iframe class="contact-about-turn__frame contact-about-turn__frame--right contact-about-turn__flip-back" src="about.html?preview=1" title="Om mig (right on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startFlipToAbout(targetHref) {
			const body = document.body;
			if (body.classList.contains('contact-about-flipping')) return;
			const existing = document.querySelector('.contact-about-transition');
			if (existing && !existing.classList.contains('is-preloading')) return;

			try {
				const old = document.querySelector('.contact-about-transition');
				// If we're preloading, reuse the overlay instead of removing it.
				if (old && !old.classList.contains('is-preloading')) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			overlay.classList.remove('swap-under-left', 'swap-under-right', 'swap-flip-mid');
			try { overlay.classList.remove('is-preloading'); } catch {}

			// Make overlay visible BEFORE hiding the current page (prevents a 1-frame blank flash).
			try { overlay.classList.add('is-ready'); } catch {}

			body.classList.add('contact-about-flip-active');
			body.classList.add('contact-about-flipping');
			body.style.overflow = 'hidden';

			// Delay the turning-sheet design swap slightly AFTER the visual midpoint,
			// so it changes when the page moves past the center into the right side.
			const FLIP_SHEET_SWAP_T = 0.60;

			const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.contact-about-turn__flip') : null;
			let midSwapScheduled = false;
			let underSwapScheduled = false;
			function scheduleMidSwapFromNow() {
				if (midSwapScheduled) return;
				midSwapScheduled = true;
				window.setTimeout(() => {
					try { overlay.classList.add('swap-flip-mid'); } catch {}
				}, Math.round(FLIP_MS * FLIP_SHEET_SWAP_T));
			}
			function scheduleUnderSwapsFromNow() {
				if (underSwapScheduled) return;
				underSwapScheduled = true;
				// Left under-page can change early (it becomes visible quickly).
				window.setTimeout(() => {
					try { overlay.classList.add('swap-under-left'); } catch {}
				}, 60);
				// Right under-page (CV/right page) must change very late.
				window.setTimeout(() => {
					try { overlay.classList.add('swap-under-right'); } catch {}
				}, Math.round(FLIP_MS * 0.985));
			}

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					overlay.classList.add('is-ready');
					requestAnimationFrame(() => {
						overlay.classList.add('is-turning');
						// Start the 50% timer when the animation actually starts painting.
						try {
							if (flipEl && flipEl.addEventListener) {
								flipEl.addEventListener('animationstart', () => {
									scheduleMidSwapFromNow();
									scheduleUnderSwapsFromNow();
								}, { once: true });
							}
						} catch {}
						// Fallback: if animationstart doesn't fire, schedule shortly after turning begins.
						window.setTimeout(() => {
							if (!midSwapScheduled) scheduleMidSwapFromNow();
							if (!underSwapScheduled) scheduleUnderSwapsFromNow();
						}, 120);
					});
				});
			});

			navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			const hrefLower = hrefAttr.toLowerCase();
			if (!(hrefLower === 'about.html' || hrefLower.startsWith('about.html#') || hrefLower.startsWith('about.html?'))) return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startFlipToAbout(a.href);
		}, true);

		// Preload the overlay (and its iframes) to avoid a brief "no design" flash.
		(function preloadOnce() {
			try {
				if (document.documentElement.classList.contains('transition-preview')) return;
				const ov = ensureOverlay();
				ov.classList.add('is-preloading');
			} catch {}
		})();

		// Drag-to-turn (Kontakt -> Om mig) from bottom-left corner.
		(function initContactToAboutDrag() {
			const DRAG_CLASS = 'contact-about-dragging';
			const COMPLETE_THRESHOLD = 0.5; // only commit after passing the middle
			const DRAG_PX = Math.max(260, Math.min(520, Math.round((mskViewportSize().w || window.innerWidth) * 0.38)));

			let handle = null;
			let dragging = false;
			let startX = 0;
			let progress = 0;
			let rafId = 0;

			function clamp01(x) { return Math.max(0, Math.min(1, x)); }
			function ensureHandle() {
				if (handle && document.body.contains(handle)) return handle;
				handle = document.createElement('div');
				handle.className = 'page-turn-handle page-turn-handle--left';
				handle.setAttribute('aria-hidden', 'true');
				document.body.appendChild(handle);
				return handle;
			}

			function setProgress(p, x, seamX, flipEl, overlay) {
				progress = clamp01(p);
				const angle = 180 * progress;
				try {
					if (flipEl) {
						flipEl.style.animation = 'none';
						flipEl.style.transition = 'none';
						flipEl.style.transform = `rotateY(${angle}deg)`;
					}
				} catch {}

				try {
					if (overlay) {
						// Change DESIGN on the flipping page exactly when crossing the middle seam.
						const cursorPastMiddle = (typeof x === 'number' && typeof seamX === 'number') ? (x >= seamX) : (progress >= 0.5);
						if (progress >= 0.5 && cursorPastMiddle) overlay.classList.add('swap-flip-mid');
						else overlay.classList.remove('swap-flip-mid');

						// Show Om mig LEFT page underneath as soon as the flip begins.
						if (progress > 0.02) overlay.classList.add('swap-under-left');
						else overlay.classList.remove('swap-under-left');

						// Keep the visible right page as Kontakt until very late.
						if (progress >= 0.985) overlay.classList.add('swap-under-right');
						else overlay.classList.remove('swap-under-right');
					}
				} catch {}
			}

			function cleanup(overlay, flipEl) {
				dragging = false;
				if (rafId) cancelAnimationFrame(rafId);
				rafId = 0;
				try { document.body.classList.remove(DRAG_CLASS, 'contact-about-flip-active', 'contact-about-flipping'); } catch {}
				try { document.body.style.overflow = ''; } catch {}
				try { if (overlay && overlay.parentNode) overlay.remove(); } catch {}
				try {
					if (flipEl) {
						flipEl.style.transition = '';
						flipEl.style.animation = '';
						flipEl.style.transform = '';
					}
				} catch {}
			}

			function startDrag(e) {
				if (dragging) return;
				if (!e || e.button !== 0) return;
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();

				dragging = true;
				startX = e.clientX;

				const body = document.body;
				body.classList.add('contact-about-flip-active', 'contact-about-flipping', DRAG_CLASS);
				body.style.overflow = 'hidden';

				try {
					const old = document.querySelector('.contact-about-transition');
					if (old) old.remove();
				} catch {}

				const overlay = ensureOverlay();
				overlay.classList.add('is-ready', 'is-turning');
				const flipEl = overlay.querySelector('.contact-about-turn__flip');

				function onMove(ev) {
					if (!dragging) return;
					const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : startX;
					const vw = mskViewportSize().w || window.innerWidth || 1;
					const seamX = vw * 0.5;

					// Map drag distance to seam-aware progress:
					// startX -> seam = 0..0.5, seam -> right edge = 0.5..1
					let p = 0;
					if (x <= startX) {
						p = 0;
					} else if (x <= seamX) {
						const denom = Math.max(1, (seamX - startX));
						p = ((x - startX) / denom) * 0.5;
					} else {
						p = 0.5 + ((x - seamX) / Math.max(1, (vw - seamX))) * 0.5;
					}
					if (!rafId) {
						rafId = requestAnimationFrame(() => {
							rafId = 0;
							setProgress(p, x, seamX, flipEl, overlay);
						});
					}
				}

				function onUp(ev) {
					try {
						if (ev) {
							ev.preventDefault();
							ev.stopPropagation();
						}
					} catch {}
					window.removeEventListener('pointermove', onMove, true);
					window.removeEventListener('pointerup', onUp, true);
					window.removeEventListener('pointercancel', onUp, true);

					const shouldComplete = progress >= COMPLETE_THRESHOLD;
					if (!shouldComplete) {
						try {
							if (flipEl) {
								flipEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
								flipEl.style.transform = 'rotateY(0deg)';
							}
						} catch {}
						window.setTimeout(() => cleanup(overlay, flipEl), 280);
						return;
					}

					mskArmPageTurnGhostClickGuard(520);

					let finishMs = 520;
					try {
						if (flipEl) {
							const ease = getPageFlipEase('cubic-bezier(.42,0,.58,1)');
							const remaining = Math.max(0, 1 - progress);
							finishMs = Math.round(Math.max(420, Math.min(FLIP_MS, FLIP_MS * remaining)));
							flipEl.style.transition = `transform ${finishMs}ms ${ease}`;
							flipEl.style.transform = 'rotateY(180deg)';
						}
						// Once we're committing the flip (only possible after 50%), ensure the turning sheet has swapped.
						overlay.classList.add('swap-flip-mid');
						// Ensure the RIGHT under-page (CV) doesn't appear early.
						// Left under-page should be visible quickly, but right under-page should only swap at the very end.
						overlay.classList.add('swap-under-left');
						window.setTimeout(() => {
							try { overlay.classList.add('swap-under-right'); } catch {}
						}, Math.round(Math.max(0, finishMs - 40)));
					} catch {}
					window.setTimeout(() => { window.location.href = 'about.html'; }, Math.round(Math.max(520, Math.min(FLIP_MS + 140, (FLIP_MS * (1 - progress)) + 260))));
				}

				window.addEventListener('pointermove', onMove, true);
				window.addEventListener('pointerup', onUp, true);
				window.addEventListener('pointercancel', onUp, true);
			}

			const h = ensureHandle();
			try {
				h.addEventListener('pointerdown', (e) => {
					try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch {}
					startDrag(e);
				});
			} catch {}
		})();
	})();

	// Matrix-ish text morph (scramble -> resolve).
	function matrixMorphText(el, finalText, opts = {}) {
		if (!el) return;
		const {
			// one-character-at-a-time pacing
			stepMs = 55,
			stepMinMs,
			stepMaxMs,
			easeInOut = false,
			flickerSteps = 4,
			flickerMs = 20,
			charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
			startDelayMs = 0,
			keepSpaces = true,
			lockedClass = 'matrix-char',
			orderMode = 'ltr', // 'ltr' | 'random' | 'center-out'
			dropClass = 'matrix-drop',
			// If omitted, we start from whatever the element currently shows (handwritten text, or "0000" noise, etc.)
			initialText,
			onComplete
		} = opts;

		const target = String(finalText ?? '');
		const len = target.length;
		const randChar = () => charset[Math.floor(Math.random() * charset.length)] || '0';
		const isSpace = (ch) => (keepSpaces && ch === ' ');

		function stepDelayMsAt(t01) {
			if (!easeInOut) return Math.max(0, stepMs);
			const mid = Math.max(0, stepMs);
			const min = Math.max(0, stepMinMs ?? Math.round(mid * 0.70));
			const max = Math.max(min, stepMaxMs ?? Math.round(mid * 1.70));
			// Ease-in-out by timing (slow at ends, fast in middle).
			const c = Math.cos(Math.PI * Math.min(1, Math.max(0, t01)));
			const endBoost = c * c; // 1 at ends, 0 at middle
			return Math.round(min + (max - min) * endBoost);
		}

		function shuffleInPlace(arr) {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			return arr;
		}

		const start = () => {
			// Start from existing text (handwritten), then convert one letter at a time to Matrix font.
			const startText = String(initialText ?? el.textContent ?? target);
			const base = (startText + target).slice(0, len); // ensure length >= target

			// Build per-letter spans so font can change per character.
			el.textContent = '';
			const spans = new Array(len);
			for (let i = 0; i < len; i++) {
				const ch = base[i] ?? target[i] ?? '';
				const sp = document.createElement('span');
				if (keepSpaces && ch === ' ') {
					sp.classList.add('matrix-space');
					sp.textContent = '\u00A0';
				} else {
					sp.textContent = ch;
				}
				spans[i] = sp;
				el.appendChild(sp);
			}

			// Decide order of letters to transform (skip spaces).
			const order = [];
			for (let i = 0; i < len; i++) if (!isSpace(target[i])) order.push(i);
			if (orderMode === 'random') {
				shuffleInPlace(order);
			} else if (orderMode === 'center-out') {
				order.sort((a, b) => {
					const ca = Math.abs(a - (len - 1) / 2);
					const cb = Math.abs(b - (len - 1) / 2);
					return ca - cb;
				});
			}

			let orderPos = 0;
			const denom = Math.max(1, order.length - 1);
			const nextDelay = () => stepDelayMsAt(orderPos / denom);
			function nextChar() {
				if (orderPos >= order.length) {
					// Ensure exact final text.
					for (let i = 0; i < len; i++) {
						if (keepSpaces && target[i] === ' ') {
							spans[i].classList.add('matrix-space');
							spans[i].textContent = '\u00A0';
						} else {
							spans[i].textContent = target[i];
						}
					}
					try { if (typeof onComplete === 'function') onComplete(); } catch {}
					return;
				}
				const idx = order[orderPos];

				let f = 0;
				function flicker() {
					// Switch THIS letter into matrix font while it scrambles.
					try {
						spans[idx].classList.add(lockedClass);
						if (dropClass) spans[idx].classList.add(dropClass);
					} catch {}
					if (f < flickerSteps) {
						spans[idx].textContent = randChar();
						f += 1;
						window.setTimeout(flicker, Math.max(0, flickerMs));
						return;
					}
					// lock final char
					spans[idx].textContent = target[idx];
					try { if (dropClass) spans[idx].classList.remove(dropClass); } catch {}
					orderPos += 1;
					window.setTimeout(nextChar, nextDelay());
				}
				flicker();
			}

			nextChar();
		};

		if (startDelayMs > 0) window.setTimeout(start, startDelayMs);
		else start();
	}

	function renderMatrixHeadline(el, text) {
		if (!el) return;
		const s = String(text ?? '');
		el.textContent = '';
		for (let i = 0; i < s.length; i++) {
			const ch = s[i];
			if (ch === ' ') {
				const sp = document.createElement('span');
				sp.className = 'matrix-space';
				sp.textContent = '\u00A0';
				el.appendChild(sp);
				continue;
			}
			const sp = document.createElement('span');
			sp.className = 'matrix-char';
			sp.textContent = ch;
			el.appendChild(sp);
		}
	}

	function getMatrixTextBounds(el) {
		try {
			const chars = el ? Array.from(el.querySelectorAll('.matrix-char, .matrix-space')) : [];
			if (!chars.length) return el ? el.getBoundingClientRect() : null;
			let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
			let seen = false;
			for (const ch of chars) {
				const r = ch.getBoundingClientRect();
				if (!r || !(r.width > 0 || r.height > 0)) continue;
				seen = true;
				minX = Math.min(minX, r.x);
				minY = Math.min(minY, r.y);
				maxX = Math.max(maxX, r.x + r.width);
				maxY = Math.max(maxY, r.y + r.height);
			}
			if (!seen) return el ? el.getBoundingClientRect() : null;
			// Snap to pixel grid to avoid subpixel mismatch between layers.
			const x = Math.round(minX);
			const y = Math.round(minY);
			const w = Math.round(maxX - minX);
			const h = Math.round(maxY - minY);
			return { x, y, w, h };
		} catch {
			return el ? el.getBoundingClientRect() : null;
		}
	}

	// "Mit AI Univers": close the book and slide to center.
	(function initAiUniverseCloseTransition() {
		// Even faster close (book appears sooner)
		const CLOSE_MS = 800;
		const SLIDE_MS = 520;
		const MORPH_TEXT = 'MIT AI UNIVERS';
		// Slightly slower, still one letter at a time (non left-to-right).
		const MORPH_OPTS = { stepMs: 55, easeInOut: true, flickerSteps: 3, flickerMs: 16, orderMode: 'random' };
		const RISE_MS = 900;
		const GLITCH_MS = 460;
		const NAV_MS = 140;
		const BASE_SHIFT_Y = 0;
		const HANDOFF_MS = 240;

		function ensureRevealFrame(overlay) {
			try {
				let wrap = overlay.querySelector('.ai-universe-reveal');
				if (!wrap) {
					wrap = document.createElement('div');
					wrap.className = 'ai-universe-reveal';
					wrap.innerHTML = `<iframe src="ai-universe.html?preview=1&reveal=1" title="AI Universe (reveal)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>`;
					overlay.appendChild(wrap);
				}
				return wrap.querySelector('iframe');
			} catch {
				return null;
			}
		}

		function ensureMeasureFrame(overlay) {
			try {
				let fr = overlay.querySelector('iframe.ai-universe-measure');
				if (fr) return fr;
				fr = document.createElement('iframe');
				fr.className = 'ai-universe-measure';
				// preview=1 prevents normal enter/morph scripts; measure=1 makes the iframe postMessage its h1 position.
				fr.src = 'ai-universe.html?preview=1&measure=1';
				fr.title = 'AI universe measure (hidden)';
				fr.tabIndex = -1;
				fr.setAttribute('aria-hidden', 'true');
				fr.style.position = 'fixed';
				fr.style.inset = '0';
				fr.style.width = '100vw';
				fr.style.height = (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('height', '100dvh')) ? '100dvh' : '100vh';
				fr.style.border = '0';
				fr.style.opacity = '0';
				fr.style.pointerEvents = 'none';
				fr.style.zIndex = '-1';
				overlay.appendChild(fr);
				return fr;
			} catch {
				return null;
			}
		}

		function waitForAiHeadlineRect(measureFrame, done) {
			let finished = false;
			const finish = (val) => {
				if (finished) return;
				finished = true;
				try { window.removeEventListener('message', onMsg); } catch {}
				try { done && done(val); } catch {}
			};
			const onMsg = (e) => {
				const d = e && e.data;
				if (!d || typeof d !== 'object') return;
				if (d.__msk !== 'ai_universe_measure') return;
				const r = d.rect;
				if (!r || typeof r !== 'object') return;
				if (typeof r.x !== 'number' || typeof r.y !== 'number' || typeof r.w !== 'number' || typeof r.h !== 'number') return;
				finish(r);
			};
			window.addEventListener('message', onMsg);

			// Ask the iframe to report *now* (avoids missing an earlier postMessage).
			try {
				const win = measureFrame && measureFrame.contentWindow;
				if (win) win.postMessage({ __msk: 'ai_universe_measure_req' }, '*');
			} catch {}

			// Retry a few times (iframe load timing can vary).
			let tries = 0;
			const retry = () => {
				if (finished) return;
				tries += 1;
				try {
					const win = measureFrame && measureFrame.contentWindow;
					if (win) win.postMessage({ __msk: 'ai_universe_measure_req' }, '*');
				} catch {}
				if (tries < 6) window.setTimeout(retry, 140);
			};
			window.setTimeout(retry, 60);

			// Absolute timeout: continue even if iframe never reports.
			window.setTimeout(() => finish(null), 1600);
		}

		function riseTitleToAiHeadline(titleEl, measureFrame, done) {
			if (!titleEl) { try { done && done(); } catch {} return; }
			// Fail-safe: if we can't measure, don't block the transition.
			if (!measureFrame) { try { done && done(); } catch {} return; }

			let doneCalled = false;
			const safeDone = () => {
				if (doneCalled) return;
				doneCalled = true;
				try { done && done(); } catch {}
			};

			waitForAiHeadlineRect(measureFrame, (targetRect) => {
				if (!targetRect) { safeDone(); return; }

				// Wait for the final "morphed" layout to settle.
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						const r0 = getMatrixTextBounds(titleEl) || titleEl.getBoundingClientRect();
						const curCx = r0.x + (r0.w / 2);
						const curCy = r0.y + (r0.h / 2);
						const tgtCx = targetRect.x + (targetRect.w / 2);
						const tgtCy = targetRect.y + (targetRect.h / 2);
						const dx = Math.round(tgtCx - curCx);
						const dy = Math.round(tgtCy - curCy);
						const s = (r0.w > 1) ? (targetRect.w / r0.w) : 1;

						// Animate by updating the CSS variable used in transform.
						titleEl.style.setProperty('--aiTitleShiftX', `${dx}px`);
						titleEl.style.setProperty('--aiTitleShiftY', `${BASE_SHIFT_Y + dy}px`);
						titleEl.style.setProperty('--aiTitleScale', `${Math.max(0.6, Math.min(1.8, s)).toFixed(4)}`);

						let finished = false;
						const finish = () => {
							if (finished) return;
							finished = true;
							try { titleEl.removeEventListener('transitionend', onEnd); } catch {}
							safeDone();
						};
						const onEnd = (e) => {
							if (!e || e.propertyName !== 'transform') return;
							finish();
						};
						try { titleEl.addEventListener('transitionend', onEnd, { once: true }); } catch {}
						window.setTimeout(finish, RISE_MS + 160);
					});
				});
			});
		}

		function ensureOverlay() {
			let overlay = document.querySelector('.ai-close-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'ai-close-transition';
				overlay.innerHTML = `
					<div class="ai-close ai-close--opened" aria-hidden="true">
						<main class="home-notebook" role="main" aria-label="Closing book transition">
							<div class="home-notebook__pages" aria-hidden="true"></div>
							<div class="home-notebook__cover" aria-hidden="true">
								<div class="home-notebook__cover-back" aria-hidden="true"></div>
							</div>
							<div class="home-notebook__leaf-fan" aria-hidden="true"></div>
							<div class="home-notebook__spread" aria-hidden="true"></div>
							<h1 class="home-notebook__title" data-text="Mikkels notesbog">Mikkels notesbog</h1>
						</main>
					</div>
					<div class="ai-close ai-close--closed" aria-hidden="true">
						<main class="home-notebook" role="main" aria-label="Closed book transition">
							<div class="home-notebook__pages" aria-hidden="true"></div>
							<div class="home-notebook__cover" aria-hidden="true">
								<div class="home-notebook__cover-back" aria-hidden="true"></div>
							</div>
							<div class="home-notebook__leaf-fan" aria-hidden="true"></div>
							<h1 class="home-notebook__title" data-text="Mikkels notesbog">Mikkels notesbog</h1>
						</main>
						<div class="ai-back-title" aria-hidden="true">MIT AI UNIVERS</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		// Pre-warm the overlay so the first click is instant.
		let didPrewarm = false;
		function prewarmOverlay() {
			if (didPrewarm) return;
			didPrewarm = true;
			try {
				// Only create the overlay container (fast).
				// Heavy iframes are created lazily later to keep animations smooth.
				ensureOverlay();
			} catch {}
		}

		function startAiClose(targetHref) {
			const body = document.body;
			if (!body || body.classList.contains('ai-close-active')) return;

			try {
				// Ensure we already have the overlay in DOM (prewarm does this too).
				prewarmOverlay();
			} catch {}

			const overlay = ensureOverlay();
			// Lazy-create these later (they're heavy).
			let measureFrame = null;
			let revealFrame = null;

			// Reset any previous run state.
			try {
				overlay.classList.remove(
					'is-ready',
					'is-closing',
					'show-closed',
					'is-sliding',
					'is-glitching',
					'book-gone',
					'reveal-ai',
					'handoff'
				);
			} catch {}

			body.style.overflow = 'hidden';

			// Tell the destination page to play the same headline morph on load.
			try {
				window.sessionStorage.setItem('ai_universe_matrix_headline', MORPH_TEXT);
				window.sessionStorage.setItem('ai_universe_matrix_ts', String(Date.now()));
				// Also trigger a smooth background "enter" on the destination page.
				window.sessionStorage.setItem('ai_universe_enter', '1');
			} catch {}

			// IMPORTANT: show the overlay first, THEN hide the page.
			// Otherwise there's a split-second where everything is hidden and looks blank.
			overlay.classList.add('is-ready');
			requestAnimationFrame(() => {
				body.classList.add('ai-close-active');
				// Start the close immediately (keeps book motion smooth).
				requestAnimationFrame(() => overlay.classList.add('is-closing'));
			});

			// Switch to closed book and slide it to center.
			window.setTimeout(() => {
				overlay.classList.add('show-closed');
				requestAnimationFrame(() => {
					overlay.classList.add('is-sliding');
				});

				// ONLY when the book is centered: "MIT AI UNIVERS" morphs Matrix-style.
				try {
					const titleEl = overlay.querySelector('.ai-close--closed .ai-back-title');
					if (titleEl) {
						window.setTimeout(() => {
							try {
								// Styling hooks (do NOT change font globally; per-letter spans handle that).
								titleEl.classList.add('is-matrix');
								// One letter at a time.
								matrixMorphText(titleEl, MORPH_TEXT, {
									...MORPH_OPTS,
									lockedClass: 'matrix-char',
									dropClass: 'matrix-drop',
									onComplete: () => {
										// 1) As soon as the text is fully morphed: make the BOOK glitch away immediately.
										try { overlay.classList.add('is-glitching'); } catch {}

										// 2) Only AFTER the book is gone: move the text up to the subpage headline position.
										const afterBookGone = () => {
											try { titleEl.classList.add('is-rising'); } catch {}
											// Ensure starting shift is known for the delta calc.
											try {
												titleEl.style.setProperty('--aiTitleShiftX', `0px`);
												titleEl.style.setProperty('--aiTitleShiftY', `${BASE_SHIFT_Y}px`);
												titleEl.style.setProperty('--aiTitleScale', `1`);
											} catch {}

											measureFrame = measureFrame || ensureMeasureFrame(overlay);
											riseTitleToAiHeadline(titleEl, measureFrame, () => {
												// 3) Reveal the AI page behind, then hand off the title into the infobox headline.
												try { overlay.classList.add('reveal-ai'); } catch {}
												revealFrame = revealFrame || ensureRevealFrame(overlay);

												// Make the infobox headline match the EXACT end position/size of the moving title.
												try {
												const r = getMatrixTextBounds(titleEl) || titleEl.getBoundingClientRect();
												const snapped = {
													x: Math.round(r.x),
													y: Math.round(r.y),
													w: Math.round(r.w ?? r.width),
													h: Math.round(r.h ?? r.height)
												};
													const payload = {
														__msk: 'ai_reveal_set_headline_rect',
													rect: snapped,
														vw: mskViewportSize().w,
														vh: mskViewportSize().h
													};
												revealFrame && revealFrame.contentWindow && revealFrame.contentWindow.postMessage(payload, '*');
												} catch {}

											const waitRectAppliedThenHandoff = () => {
												let doneOnce = false;
												const finish = () => {
													if (doneOnce) return;
													doneOnce = true;
													try { window.removeEventListener('message', onMsg); } catch {}
													// show reveal headline, then fade out overlay title in the next frame
													try { revealFrame && revealFrame.contentWindow && revealFrame.contentWindow.postMessage({ __msk: 'ai_reveal_show_headline' }, '*'); } catch {}
													requestAnimationFrame(() => {
														try { overlay.classList.add('handoff'); } catch {}
													});
												};
												const onMsg = (e) => {
													const d = e && e.data;
													if (!d || typeof d !== 'object') return;
													if (d.__msk !== 'ai_reveal_rect_applied') return;
													finish();
												};
												window.addEventListener('message', onMsg);
												window.setTimeout(finish, 220); // fallback if ack is missed
											};

											const trySetRect = () => {
												try {
													const r = getMatrixTextBounds(titleEl) || titleEl.getBoundingClientRect();
													const payload = {
														__msk: 'ai_reveal_set_headline_rect',
														rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w ?? r.width), h: Math.round(r.h ?? r.height) },
														vw: mskViewportSize().w,
														vh: mskViewportSize().h
													};
													revealFrame && revealFrame.contentWindow && revealFrame.contentWindow.postMessage(payload, '*');
												} catch {}
											};

											waitRectAppliedThenHandoff();
											trySetRect();

												try {
													if (revealFrame) {
													// If not loaded yet, wait once then re-send rect.
													revealFrame.addEventListener('load', () => trySetRect(), { once: true });
													}
												} catch {}

												// Tell destination page: headline is already aligned on-screen.
												try { window.sessionStorage.setItem('ai_universe_aligned', '1'); } catch {}

												// Navigate shortly after handoff.
												window.setTimeout(() => {
													window.location.href = targetHref;
												}, HANDOFF_MS + NAV_MS);
											});
										};

										// Prefer real animation end (no guessing). Fallback to timeout.
										try {
											const bookEl = overlay.querySelector('.ai-close--closed .home-notebook');
											if (bookEl) {
												const onEnd = (e) => {
													if (!e || e.animationName !== 'matrixGlitchAway') return;
													try { overlay.classList.add('book-gone'); } catch {}
													try { bookEl.removeEventListener('animationend', onEnd); } catch {}
													afterBookGone();
												};
												bookEl.addEventListener('animationend', onEnd);
												// Hard fallback in case animationend doesn't fire.
												window.setTimeout(() => {
													try { overlay.classList.add('book-gone'); } catch {}
													try { bookEl.removeEventListener('animationend', onEnd); } catch {}
													afterBookGone();
												}, GLITCH_MS + 120);
												return;
											}
										} catch {}

										window.setTimeout(afterBookGone, GLITCH_MS + 120);
									}
								});
							} catch {}
						}, Math.max(0, SLIDE_MS));
					}
				} catch {}
			}, CLOSE_MS);
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'ai-universe.html') return;
			// If already on AI page, allow default.
			try {
				const path = (window.location.pathname || '').toLowerCase();
				if (path.endsWith('/ai-universe.html') || path.endsWith('ai-universe.html')) return;
			} catch {}
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			try { e.stopImmediatePropagation(); } catch {}
			startAiClose(a.href);
		}, true);

		// Prewarm ASAP after load (doesn't show anything, just builds DOM/iframes).
		try {
			if ('requestIdleCallback' in window) {
				window.requestIdleCallback(() => prewarmOverlay(), { timeout: 800 });
			} else {
				window.setTimeout(prewarmOverlay, 0);
			}
		} catch {}
	})();

	// On the AI Universe page: play the same Matrix headline morph on load.
	(function initAiUniverseHeadlineMatrix() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/ai-universe.html') && !path.endsWith('ai-universe.html')) return;
		} catch {
			return;
		}

		// If this page is loaded as a hidden "measure" iframe, report the headline position and stop.
		try {
			const qs = new URLSearchParams(window.location.search || '');
			if (qs.get('measure') === '1') {
				const send = () => {
					try {
						window.scrollTo(0, 0);
						const h1 = document.getElementById('ai-universe-headline') || document.querySelector('.ai-universe-page h1');
						if (!h1) return;
						// Measure using the SAME visual style as the final matrix headline.
						try { h1.classList.add('matrix-headline'); } catch {}
						// Ensure identical glyph spacing (per-letter spans) for measurement too.
						try { renderMatrixHeadline(h1, h1.textContent); } catch {}
						const r = getMatrixTextBounds(h1) || h1.getBoundingClientRect();
						window.parent && window.parent.postMessage({
							__msk: 'ai_universe_measure',
							rect: { x: r.x, y: r.y, w: r.w ?? r.width, h: r.h ?? r.height },
							vw: mskViewportSize().w,
							vh: mskViewportSize().h
						}, '*');
					} catch {}
				};
				// Respond on load, and also when the parent explicitly requests a measurement.
				try {
					window.addEventListener('message', (e) => {
						const d = e && e.data;
						if (!d || typeof d !== 'object') return;
						if (d.__msk !== 'ai_universe_measure_req') return;
						requestAnimationFrame(() => requestAnimationFrame(send));
					});
				} catch {}
				requestAnimationFrame(() => requestAnimationFrame(send));
				return;
			}
		} catch {}

		// IMPORTANT: if this is a preview/measure iframe, do not run enter/morph logic.
		// Previews are used inside transition overlays and should stay static.
		try {
			const qs = new URLSearchParams(window.location.search || '');
			if (qs.get('preview') === '1') return;
		} catch {}

		let target = null;
		try { target = window.sessionStorage.getItem('ai_universe_matrix_headline'); } catch {}
		if (!target) return;

		let alreadyAligned = false;
		try { alreadyAligned = window.sessionStorage.getItem('ai_universe_aligned') === '1'; } catch {}

		// Mark aligned state so CSS can keep content stable.
		if (alreadyAligned) {
			try { document.body.classList.add('ai-aligned'); } catch {}
		}

		// Smooth background enter only when coming from the book transition.
		try {
			// If headline is already aligned, keep the headline/content stable (no slide-in).
			if (!alreadyAligned && window.sessionStorage.getItem('ai_universe_enter') === '1') {
				document.body.classList.add('ai-enter');
				requestAnimationFrame(() => document.body.classList.add('ai-enter-active'));
				window.setTimeout(() => {
					try { document.body.classList.remove('ai-enter', 'ai-enter-active'); } catch {}
				}, 1400);
			}
		} catch {}

		const h1 = document.getElementById('ai-universe-headline') || document.querySelector('.ai-universe-page h1');
		if (!h1) return;

		// If the transition already moved the title into the correct position,
		// keep the headline stable (no extra motion/morph).
		if (alreadyAligned) {
			h1.classList.add('matrix-headline');
			renderMatrixHeadline(h1, target);
			try {
				window.sessionStorage.removeItem('ai_universe_matrix_headline');
				window.sessionStorage.removeItem('ai_universe_matrix_ts');
				window.sessionStorage.removeItem('ai_universe_enter');
				window.sessionStorage.removeItem('ai_universe_aligned');
			} catch {}
			return;
		}

		// Animate headline from the book-title position into the box position.
		try {
			const raw = window.sessionStorage.getItem('ai_universe_from_rect');
			if (raw) {
				window.sessionStorage.removeItem('ai_universe_from_rect');
				const from = JSON.parse(raw);
				// Only if viewport seems unchanged.
				if (from && Math.abs((from.vw || 0) - mskViewportSize().w) < 3 && Math.abs((from.vh || 0) - mskViewportSize().h) < 3) {
					window.scrollTo(0, 0);
					// Wait for layout (2 frames).
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							const end = h1.getBoundingClientRect();
							const fromCx = (from.x + from.w / 2);
							const fromCy = (from.y + from.h / 2);
							const endCx = (end.x + end.width / 2);
							const endCy = (end.y + end.height / 2);
							const dx = fromCx - endCx;
							const dy = fromCy - endCy;
							const s = Math.max(0.6, Math.min(1.8, (from.w / Math.max(1, end.width))));
							h1.style.willChange = 'transform';
							h1.style.transformOrigin = 'center';
							h1.style.transition = 'transform 1050ms cubic-bezier(.2,.9,.2,1)';
							h1.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
							requestAnimationFrame(() => {
								h1.style.transform = 'translate(0px, 0px) scale(1)';
							});
						});
					});
				}
			}
		} catch {}

		// Clear flag so it only runs once.
		try {
			window.sessionStorage.removeItem('ai_universe_matrix_headline');
			window.sessionStorage.removeItem('ai_universe_matrix_ts');
			window.sessionStorage.removeItem('ai_universe_enter');
			window.sessionStorage.removeItem('ai_universe_aligned');
		} catch {}

		h1.classList.add('matrix-headline');
		// Start from "noise" so it feels like a continuation.
		h1.textContent = String(target).replace(/[^\s]/g, '0');
		// One letter at a time.
		matrixMorphText(h1, target, {
			stepMs: 62,
			easeInOut: true,
			flickerSteps: 3,
			flickerMs: 16,
			charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
			lockedClass: 'matrix-char',
			orderMode: 'random',
			dropClass: 'matrix-drop'
		});
	})();

	// Kontakt -> Projekter: flip TWO pages fast (hint of "Om mig" in-between),
	// but this time it's the LEFT page that flips to the RIGHT.
	(function initContactToProjectsDoubleFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/contact.html') && !path.endsWith('contact.html')) return;
		} catch {
			return;
		}

		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.contact-projects-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'contact-projects-transition cp-stage-contact';
				overlay.innerHTML = `
					<div class="cp-turn" aria-hidden="true">
						<div class="cp-under cp-under--left">
							<iframe class="cp-frame cp-frame--left cp-under-frame cp-under-frame--contact" src="contact.html?preview=1" title="Kontakt (left)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="cp-frame cp-frame--left cp-under-frame cp-under-frame--about" src="about.html?preview=1" title="Om mig (left)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="cp-frame cp-frame--left cp-under-frame cp-under-frame--projects" src="projects.html?preview=1" title="Projekter (left)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="cp-under cp-under--right">
							<iframe class="cp-frame cp-frame--right cp-under-frame cp-under-frame--contact" src="contact.html?preview=1" title="Kontakt (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="cp-frame cp-frame--right cp-under-frame cp-under-frame--about" src="about.html?preview=1" title="Om mig (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="cp-frame cp-frame--right cp-under-frame cp-under-frame--projects" src="projects.html?preview=1" title="Projekter (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<!-- Flip 1: Contact -> About (left page flips right)
						     Turning sheet shows Kontakt LEFT until seam, then Om mig RIGHT (CV/udmærkelser). -->
						<div class="cp-flip cp-flip--one">
							<div class="cp-flip__content cp-flip__content--normal" aria-hidden="true">
								<iframe class="cp-frame cp-frame--left cp-flip-frame cp-flip1-front--contact" src="contact.html?preview=1" title="Kontakt (left on turning sheet, before seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="cp-flip__content cp-flip__content--mirrored" aria-hidden="true">
								<iframe class="cp-frame cp-frame--right cp-flip-frame cp-flip1-back--about" src="about.html?preview=1" title="Om mig (right on turning sheet, after seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>

						<!-- Flip 2: About -> Projects (left page flips right)
						     Turning sheet shows Om mig LEFT until seam, then Projekter RIGHT. -->
						<div class="cp-flip cp-flip--two">
							<div class="cp-flip__content cp-flip__content--normal" aria-hidden="true">
								<iframe class="cp-frame cp-frame--left cp-flip-frame cp-flip2-front--about" src="about.html?preview=1" title="Om mig (left on turning sheet, before seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="cp-flip__content cp-flip__content--mirrored" aria-hidden="true">
								<iframe class="cp-frame cp-frame--right cp-flip-frame cp-flip2-back--projects" src="projects.html?preview=1" title="Projekter (right on turning sheet, after seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startDoubleFlipToProjects(targetHref) {
			const body = document.body;
			if (body.classList.contains('cp-flipping') || document.querySelector('.contact-projects-transition')) return;

			try {
				const old = document.querySelector('.contact-projects-transition');
				if (old) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			const FLIP_MS = getCssVarMsFromEl(overlay, '--pageFlipMs', 1200);
			const FLIP2_START_MS = Math.round(FLIP_MS * 0.62); // overlap

			function scheduleAtAngle(flipEl, triggerDeg, fn, fallbackMs) {
				let done = false;
				function fire() {
					if (done) return;
					done = true;
					try { fn(); } catch {}
				}
				// Angle-based detection (0 -> 180, seam at 90)
				function tick(startAt) {
					if (done) return;
					try {
						const ang = angleDegFromMatrix3d(window.getComputedStyle(flipEl).transform);
						if (typeof ang === 'number' && ang >= triggerDeg) {
							fire();
							return;
						}
					} catch {}
					const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					if ((now - startAt) >= fallbackMs) {
						fire();
						return;
					}
					requestAnimationFrame(() => tick(startAt));
				}
				function startWatcher() {
					const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					requestAnimationFrame(() => tick(startAt));
				}
				// Anchor watcher close to animation start.
				try {
					let started = false;
					flipEl.addEventListener('animationstart', () => {
						if (started) return;
						started = true;
						startWatcher();
					}, { once: true });
					// Fallback in case animationstart doesn't fire (rare)
					window.setTimeout(() => {
						if (started) return;
						started = true;
						startWatcher();
					}, 0);
				} catch {
					window.setTimeout(fire, fallbackMs);
				}
			}

			// Avoid any iframe "wrong page" flash: only show frames after load.
			try {
				const frames = Array.from(overlay.querySelectorAll('iframe'));
				frames.forEach((fr) => {
					fr.classList.remove('is-loaded');
					fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
				});
			} catch {}
			overlay.classList.remove(
				'is-ready',
				'turning1',
				'turning2',
				'cp-swap1-mid',
				'cp-swap2-mid',
				'swap-left-to-about',
				'swap-right-to-about',
				'swap-left-to-projects',
				'swap-right-to-projects',
				'cp-stage-contact',
				'cp-stage-about',
				'cp-stage-projects'
			);
			overlay.classList.add('cp-stage-contact');

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					overlay.classList.add('is-ready');
					body.classList.add('contact-projects-flip-active');
					body.classList.add('cp-flipping');
					body.style.overflow = 'hidden';

							// Trigger slightly BEFORE the visual seam so the design switches earlier.
							const SWAP_DEG = 75;

					// Flip 1 (Contact -> About)
					requestAnimationFrame(() => overlay.classList.add('turning1'));
					// Left side is covered immediately by the turning sheet.
					// Left page lifts immediately -> swap under-left immediately (no flash)
					overlay.classList.add('swap-left-to-about');
					// Switch the right side + turning sheet design at the true visual seam.
					try {
						const flip1 = overlay.querySelector('.cp-flip--one');
						if (flip1) {
									const fb = Math.round(FLIP_MS * 0.5) + 40;
									scheduleAtAngle(flip1, SWAP_DEG, () => overlay.classList.add('swap-right-to-about'), fb);
									scheduleAtAngle(flip1, SWAP_DEG, () => overlay.classList.add('cp-swap1-mid'), fb);
						} else {
							window.setTimeout(() => overlay.classList.add('swap-right-to-about'), Math.round(FLIP_MS * 0.5));
							window.setTimeout(() => overlay.classList.add('cp-swap1-mid'), Math.round(FLIP_MS * 0.5));
						}
					} catch {
						window.setTimeout(() => overlay.classList.add('swap-right-to-about'), Math.round(FLIP_MS * 0.5));
						window.setTimeout(() => overlay.classList.add('cp-swap1-mid'), Math.round(FLIP_MS * 0.5));
					}
					// Stage change slightly after seam.
					window.setTimeout(() => {
						overlay.classList.remove('cp-stage-contact');
						overlay.classList.add('cp-stage-about');
					}, Math.round(FLIP_MS * 0.52));
					// Cleanup flip1 toggles when done.
					window.setTimeout(() => {
						overlay.classList.remove('turning1', 'swap-left-to-about', 'swap-right-to-about', 'cp-swap1-mid');
					}, FLIP_MS);

					// Flip 2 (About -> Projects) starts before flip 1 finishes.
					window.setTimeout(() => {
						overlay.classList.add('turning2');
						// Left page lifts immediately -> swap under-left immediately (no flash)
						overlay.classList.add('swap-left-to-projects');
						try {
							const flip2 = overlay.querySelector('.cp-flip--two');
							if (flip2) {
								const fb = Math.round(FLIP_MS * 0.5) + 40;
										scheduleAtAngle(flip2, SWAP_DEG, () => overlay.classList.add('swap-right-to-projects'), fb);
										scheduleAtAngle(flip2, SWAP_DEG, () => overlay.classList.add('cp-swap2-mid'), fb);
							} else {
								window.setTimeout(() => overlay.classList.add('swap-right-to-projects'), Math.round(FLIP_MS * 0.5));
								window.setTimeout(() => overlay.classList.add('cp-swap2-mid'), Math.round(FLIP_MS * 0.5));
							}
						} catch {
							window.setTimeout(() => overlay.classList.add('swap-right-to-projects'), Math.round(FLIP_MS * 0.5));
							window.setTimeout(() => overlay.classList.add('cp-swap2-mid'), Math.round(FLIP_MS * 0.5));
						}
					}, FLIP2_START_MS);

					window.setTimeout(() => {
						overlay.classList.remove('turning2', 'swap-left-to-projects', 'swap-right-to-projects', 'cp-swap2-mid');
						overlay.classList.remove('cp-stage-about');
						overlay.classList.add('cp-stage-projects');
					}, FLIP2_START_MS + FLIP_MS);

					window.setTimeout(() => {
						window.location.href = targetHref;
					}, FLIP2_START_MS + FLIP_MS + NAV_MS);
				});
			});
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'projects.html') return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			// Prevent other "to projects" transitions from also running.
			try { e.stopImmediatePropagation(); } catch {}
			startDoubleFlipToProjects(a.href);
		}, true);
	})();

	// Right-edge navigation (since navbar is currently hidden)
	(function initEdgeNav() {
		// Top navbar is now always visible; do not mount edge-nav.
		try {
			if (document.documentElement && document.documentElement.classList.contains('transition-preview')) return;
			const topNav = document.querySelector('.navbar');
			if (topNav && window.getComputedStyle && window.getComputedStyle(topNav).display !== 'none') return;
		} catch {}

		const existing = document.querySelector('.edge-nav');
		if (existing) return;

		const nav = document.createElement('div');
		nav.className = 'edge-nav';
		nav.setAttribute('aria-label', 'Side navigation');

		const handle = document.createElement('div');
		handle.className = 'edge-nav__handle';
		handle.setAttribute('aria-hidden', 'true');

		const panel = document.createElement('div');
		panel.className = 'edge-nav__panel';

		const title = document.createElement('div');
		title.className = 'edge-nav__title';
		title.textContent = 'Menu';

		const links = [
			{ href: 'index.html', text: 'HJEM' },
			{ href: 'projects.html', text: 'PROJEKTER' },
			{ href: 'about.html', text: 'OM MIG' },
			{ href: 'about.html#cv', text: 'CV' },
			{ href: 'about.html#udmaerkelser', text: 'UDMÆRKELSER' },
			{ href: 'contact.html', text: 'KONTAKT' },
			{ href: 'ai-universe.html', text: 'MIN AI UNIVERS' },
		];

		panel.appendChild(title);
		links.forEach(({ href, text }) => {
			const a = document.createElement('a');
			a.className = 'edge-nav__link';
			a.href = href;
			a.textContent = text;
			panel.appendChild(a);
		});

		nav.appendChild(handle);
		nav.appendChild(panel);
		document.body.appendChild(nav);

		const OPEN_PX = 10; // distance from right edge
		let open = false;
		let closeTimer = null;

		function setOpen(next) {
			if (open === next) return;
			open = next;
			nav.classList.toggle('is-open', open);
		}

		function scheduleClose() {
			if (closeTimer) window.clearTimeout(closeTimer);
			closeTimer = window.setTimeout(() => setOpen(false), 220);
		}

		window.addEventListener('mousemove', (e) => {
			// Don't show during book animation; CSS also hides, this is extra safety.
			if (document.body.classList.contains('home-opening-projects') ||
				document.body.classList.contains('home-opening-layout') ||
				document.body.classList.contains('home-opened-projects') ||
				document.body.classList.contains('home-shift-projects')) {
				setOpen(false);
				return;
			}
			const dist = (mskViewportSize().w || window.innerWidth) - e.clientX;
			if (dist <= OPEN_PX) {
				if (closeTimer) window.clearTimeout(closeTimer);
				setOpen(true);
			} else if (open) {
				scheduleClose();
			}
		});

		nav.addEventListener('mouseenter', () => {
			if (closeTimer) window.clearTimeout(closeTimer);
			setOpen(true);
		});
		nav.addEventListener('mouseleave', () => scheduleClose());

		// Keyboard accessibility: open when focused inside.
		nav.addEventListener('focusin', () => setOpen(true));
		nav.addEventListener('focusout', (e) => {
			if (!nav.contains(e.relatedTarget)) scheduleClose();
		});
	})();

	// Projects book-flip transition (works from ALL pages).
	(function initProjectsFlipTransition() {
		const body = document.body;
		if (!body) return;

		function ensureTransitionNotebook() {
			// If we're already on the frontpage, the notebook markup exists.
			let notebook = document.querySelector('main.home-notebook');

			// Otherwise, create a fixed overlay notebook just for the transition.
			let overlay = document.querySelector('.projects-transition');
			if (!notebook) {
				if (!overlay) {
					overlay = document.createElement('div');
					overlay.className = 'projects-transition';
					overlay.innerHTML = `
						<main class="home-notebook" role="main" aria-label="Projekter transition">
							<div class="home-notebook__pages" aria-hidden="true"></div>
							<div class="home-notebook__cover" aria-hidden="true">
								<div class="home-notebook__cover-back" aria-hidden="true"></div>
							</div>
							<div class="home-notebook__leaf-fan" aria-hidden="true"></div>
							<div class="home-notebook__spread" aria-hidden="true">
								<iframe
									class="home-notebook__projekter-full"
									src="projects.html"
									title="Projekter preview"
									loading="eager"
									referrerpolicy="no-referrer"
									tabindex="-1"
								></iframe>
							</div>
							<h1 class="home-notebook__title" data-text="Mikkels notesbog">Mikkels notesbog</h1>
						</main>
					`;
					document.body.appendChild(overlay);
				}
				notebook = overlay.querySelector('main.home-notebook');
			}

			// Turn on the home-notebook transition styling even on subpages.
			body.classList.add('home-notebook-page');
			body.classList.add('projects-transition-active');

			const rightFrame = notebook.querySelector('.home-notebook__projekter-full');
			const cover = notebook.querySelector('.home-notebook__cover');
			let leftFrame = notebook.querySelector('.home-notebook__projekter-left');
			if (cover && !leftFrame) {
				leftFrame = document.createElement('iframe');
				leftFrame.className = 'home-notebook__projekter-left';
				leftFrame.src = 'projects.html';
				leftFrame.title = 'Projekter preview (left)';
				leftFrame.loading = 'eager';
				leftFrame.referrerPolicy = 'no-referrer';
				leftFrame.tabIndex = -1;
				cover.appendChild(leftFrame);
			}

			return { notebook, overlay, rightFrame, leftFrame };
		}

		function injectHomePreviewCSS(doc) {
			if (!doc || !doc.head) return;
			let style = doc.getElementById('home-preview-style');
			if (!style) {
				style = doc.createElement('style');
				style.id = 'home-preview-style';
				doc.head.appendChild(style);
			}
			style.textContent = `
				html.home-preview,
				html.home-preview body {
					margin: 0 !important;
					overflow: hidden !important;
				}
			`;
		}

		function prepOneFrame(fr) {
			try {
				if (!fr || !fr.contentDocument) return false;
				const doc = fr.contentDocument;
				doc.documentElement.classList.add('home-preview');
				doc.documentElement.classList.add('home-preview-reveal');
				injectHomePreviewCSS(doc);
				fr.dataset.homePreviewReady = '1';
				return true;
			} catch {
				return false;
			}
		}

		function startProjectsTransition(targetHref) {
			// Avoid re-entry.
			if (body.classList.contains('home-opening-projects') || body.classList.contains('home-shift-projects')) return;

			const { rightFrame, leftFrame } = ensureTransitionNotebook();

			// Prep iframes (no flash).
			[rightFrame, leftFrame].filter(Boolean).forEach((fr) => {
				if (!fr) return;
				if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
			});

			// Reset later-phase classes.
			body.classList.remove('home-zoom-projects');
			body.classList.remove('home-opened-projects');
			body.classList.remove('home-opening-projects');
			body.classList.remove('home-opening-layout');
			body.classList.remove('home-opening-center');
			body.classList.remove('home-reveal-projects');

			// Phase 0: shift the closed book right so the spine sits at screen middle.
			body.classList.add('home-shift-projects');
			body.classList.add('home-reveal-projects');

			// Phase 1: open from the center seam.
			window.setTimeout(() => {
				body.style.setProperty('--precenterShiftX', `0px`);
				body.classList.add('home-opening-layout');
				requestAnimationFrame(() => {
					body.classList.add('home-opening-projects');
					body.classList.remove('home-opening-layout');
				});
			}, 900);

			// Phase 2: once opened, show the full connected spread (two pages).
			window.setTimeout(() => {
				body.classList.add('home-opened-projects');
				body.classList.remove('home-opening-center');
				body.classList.remove('home-shift-projects');
				body.style.removeProperty('--precenterShiftX');
			}, 900 + 3200);

			// Navigate right after the open settles.
			window.setTimeout(() => {
				window.location.href = targetHref;
			}, 900 + 3200 + 140);
		}

		// Delegate clicks so dynamically created edge-nav links also work.
		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'projects.html') return;

			// Let the custom "Om mig -> Projekter" left-page flip handle this.
			try {
				const path = (window.location.pathname || '').toLowerCase();
				if (path.endsWith('/about.html') || path.endsWith('about.html')) return;
			} catch {}

			// Notebook transition only from home; project/case pages use normal navigation.
			try {
				if (!mskIsHomeIndexPage()) return;
			} catch {}

			// If already on projects, allow default.
			if ((window.location.pathname || '').toLowerCase().endsWith('/projects.html')) return;

			// Allow normal browser behaviors (new tab, etc.)
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startProjectsTransition(a.href);
		}, true);

		// If we're on the frontpage, prep the preview immediately.
		if (body.classList.contains('home-notebook-page')) {
			const { rightFrame, leftFrame } = ensureTransitionNotebook();
			[rightFrame, leftFrame].filter(Boolean).forEach((fr) => {
				if (!fr) return;
				if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
			});
		}
	})();

	/**
	 * Projekter mindmap: fuld genoptegning (ringe, linjer) kun når layout-viewport ændrer sig (innerWidth/innerHeight).
	 * Ren browser-/DevTools-zoom uden layout-ændring udløser ofte visualViewport.resize med nye getBoundingClientRect()-værdier → ovale/cirkler “hopper” i form (preserveAspectRatio none).
	 */
	let mskProjectsMindmapLastLayoutIw = -1;
	let mskProjectsMindmapLastLayoutIh = -1;
	/** Pixel-drift der ignoreres (Safari kan flappe 1–2px i innerHeight når UI vises/skjules). */
	const MSK_PROJECTS_MINDMAP_LAYOUT_EPS_PX = 4;
	let mskProjectsMindmapRefreshDebounce = null;
	function mskProjectsMindmapLayoutResizeMeaningful() {
		try {
			const { w: iw, h: ih } = mskProjectsLayoutViewportBox();
			if (mskProjectsMindmapLastLayoutIw < 0) {
				mskProjectsMindmapLastLayoutIw = iw;
				mskProjectsMindmapLastLayoutIh = ih;
				return true;
			}
			if (
				Math.abs(iw - mskProjectsMindmapLastLayoutIw) >= MSK_PROJECTS_MINDMAP_LAYOUT_EPS_PX ||
				Math.abs(ih - mskProjectsMindmapLastLayoutIh) >= MSK_PROJECTS_MINDMAP_LAYOUT_EPS_PX
			) {
				mskProjectsMindmapLastLayoutIw = iw;
				mskProjectsMindmapLastLayoutIh = ih;
				return true;
			}
			return false;
		} catch (_) {
			return true;
		}
	}

	function mskProjectsMindmapNeedsGraphicRebuild() {
		try {
			const svg = document.querySelector('.connecting-lines');
			const container = document.querySelector('.brainstorm-container');
			if (!svg || svg.dataset.mskDynamicGraphicsBuilt !== '1') return true;
			if (
				mskIsProjectsTabletLandscapeViewport() &&
				container &&
				container.querySelector('.msk-portrait-ring-overlay')
			) {
				return true;
			}
			const nodes = document.querySelectorAll('.project-node');
			if (!nodes.length) return false;
			if (mskShouldUsePortraitHtmlRings() && container) {
				const rings = container.querySelectorAll(
					'.msk-portrait-ring-overlay.hand-drawn-frame'
				);
				if (rings.length < nodes.length) return true;
				return false;
			}
			const sw = parseFloat(svg.getAttribute('width') || '0') || svg.clientWidth || 0;
			const sh = parseFloat(svg.getAttribute('height') || '0') || svg.clientHeight || 0;
			for (const node of nodes) {
				const href = (node.dataset.nodeHref || node.getAttribute('href') || '').toLowerCase();
				if (!href) continue;
				const frame = svg.querySelector(`.hand-drawn-frame[data-node-href="${href}"]`);
				if (!frame) return true;
				const portraitGridActive =
					!!(
						container &&
						(container.classList.contains('projects-mindmap--portrait') ||
							mskIsProjectsPortraitGridDocumentMode())
					);
				const ipadLandscapeActive =
					!!(mskIsProjectsTabletLandscapeViewport() && container && !portraitGridActive);
				if (
					(portraitGridActive || ipadLandscapeActive) &&
					!mskProjectsMindmapFrameAlignedWithNode(frame, node, svg, container)
				) {
					return true;
				}
				const fw = parseFloat(frame.getAttribute('width') || '0');
				const fh = parseFloat(frame.getAttribute('height') || '0');
				const fx = parseFloat(frame.getAttribute('x') || '0');
				const fy = parseFloat(frame.getAttribute('y') || '0');
				if (fw > 0 && fh > 0 && (fw < 12 || fh < 12)) return true;
				if (fw > 0 && fh > 0 && fx + fw < 6 && fy + fh < 6) return true;
				if (sw > 0 && sh > 0 && fw > 0 && fh > 0) {
					if (fx > sw + 40 || fy > sh + 40 || fx + fw < -40 || fy + fh < -40) return true;
				}
			}
			return false;
		} catch (_) {
			return true;
		}
	}

	function mskIsProjectsPortraitTouchGridMode() {
		try {
			return !!(
				mskIsProjectsPhonePortraitViewport() ||
				mskIsProjectsTabletPortraitViewport() ||
				document.documentElement.classList.contains('msk-projects-phone-portrait') ||
				document.documentElement.classList.contains('msk-projects-ipad-portrait') ||
				mskIsProjectsPortraitGridDocumentMode()
			);
		} catch (_) {
			return false;
		}
	}

	function mskEnsureProjectsPortraitSvgBox() {
		try {
			const container = document.querySelector('.brainstorm-container');
			const svg = document.querySelector('.connecting-lines');
			if (!container || !svg) return;
			const cr = container.getBoundingClientRect();
			const w = Math.round(Math.max(1, container.clientWidth || cr.width || window.innerWidth || 375));
			const h = Math.round(Math.max(1, container.clientHeight || cr.height || window.innerHeight || 667));
			svg.setAttribute('width', String(w));
			svg.setAttribute('height', String(h));
			svg.style.setProperty('width', '100%', 'important');
			svg.style.setProperty('height', '100%', 'important');
			svg.style.setProperty('overflow', 'visible', 'important');
			svg.style.setProperty('visibility', 'visible', 'important');
			svg.style.setProperty('opacity', '1', 'important');
		} catch (_) {}
	}

	function mskProjectsSyncLayoutBeforePaint() {
		try {
			const container = document.querySelector('.brainstorm-container');
			const svg = document.querySelector('.connecting-lines');
			if (container) {
				void container.offsetHeight;
				void container.getBoundingClientRect();
			}
			mskEnsureProjectsPortraitSvgBox();
			if (svg) void svg.getBoundingClientRect();
		} catch (_) {}
	}

	function mskSvgPointFromClientPx(svgEl, clientX, clientY) {
		try {
			if (!svgEl || !svgEl.getBoundingClientRect) {
				return { x: clientX, y: clientY };
			}
			const svgRect = svgEl.getBoundingClientRect();
			const sw = Math.max(svgRect.width, 1e-6);
			const sh = Math.max(svgRect.height, 1e-6);
			const cw = Math.max(svgEl.clientWidth || svgRect.width || 1, 1);
			const ch = Math.max(svgEl.clientHeight || svgRect.height || 1, 1);
			return {
				x: (clientX - svgRect.left) * (cw / sw),
				y: (clientY - svgRect.top) * (ch / sh),
			};
		} catch (_) {
			return { x: clientX, y: clientY };
		}
	}

	function mskSvgCenterFromRect(svgEl, domRect, containerRect) {
		try {
			if (!domRect) return { x: 0, y: 0 };
			if (!svgEl || !svgEl.getBoundingClientRect) {
				return {
					x: domRect.left - containerRect.left + domRect.width / 2,
					y: domRect.top - containerRect.top + domRect.height / 2,
				};
			}
			const cx = domRect.left + domRect.width / 2;
			const cy = domRect.top + domRect.height / 2;
			return mskSvgPointFromClientPx(svgEl, cx, cy);
		} catch (_) {
			return {
				x: domRect.left - containerRect.left + domRect.width / 2,
				y: domRect.top - containerRect.top + domRect.height / 2,
			};
		}
	}

	function mskProjectsMindmapNodeCenterSvg(node, svg, container, containerRect) {
		try {
			const portraitGrid =
				!!(
					container &&
					(container.classList.contains('projects-mindmap--portrait') ||
						mskIsProjectsPortraitGridDocumentMode())
				);
			if (portraitGrid) {
				let gx = parseFloat(node.dataset.mskGridCx || '');
				let gy = parseFloat(node.dataset.mskGridCy || '');
				if (!Number.isFinite(gx)) gx = parseFloat(node.style.left);
				if (!Number.isFinite(gy)) gy = parseFloat(node.style.top);
				if (Number.isFinite(gx) && Number.isFinite(gy)) {
					const cr = container.getBoundingClientRect();
					return mskSvgPointFromClientPx(svg, cr.left + gx, cr.top + gy);
				}
			}
			const ipadLs =
				!!(
					mskIsProjectsTabletLandscapeViewport() &&
					container &&
					!container.classList.contains('projects-mindmap--portrait')
				);
			const titleImg = ipadLs ? node.querySelector('.project-node__title-img') : null;
			const titleEl = node.querySelector('.project-node__title');
			const anchorRect = titleImg
				? titleImg.getBoundingClientRect()
				: titleEl
					? titleEl.getBoundingClientRect()
					: node.getBoundingClientRect();
			return mskSvgCenterFromRect(svg, anchorRect, containerRect);
		} catch (_) {
			return { x: 0, y: 0 };
		}
	}

	function mskProjectsMindmapFrameAlignedWithNode(frame, node, svg, container) {
		try {
			if (!frame || !node || !svg || !container) return true;
			const fx = parseFloat(frame.getAttribute('x') || '0');
			const fy = parseFloat(frame.getAttribute('y') || '0');
			const fw = parseFloat(frame.getAttribute('width') || '0');
			const fh = parseFloat(frame.getAttribute('height') || '0');
			if (!(fw > 0 && fh > 0)) return false;
			const fcx = fx + fw / 2;
			const fcy = fy + fh / 2;
			const nc = mskProjectsMindmapNodeCenterSvg(node, svg, container, container.getBoundingClientRect());
			const dx = fcx - nc.x;
			const dy = fcy - nc.y;
			const maxDist = Math.max(96, Math.min(fw, fh) * 0.52);
			return Math.sqrt(dx * dx + dy * dy) <= maxDist;
		} catch (_) {
			return true;
		}
	}

	function mskProjectsMindmapIpadLandscapeFramesReady() {
		try {
			if (!mskIsProjectsTabletLandscapeViewport()) return true;
			const container = document.querySelector('.brainstorm-container');
			if (!container || container.classList.contains('projects-mindmap--portrait')) return true;
			const svg = document.querySelector('.connecting-lines');
			if (!svg || !container) return false;
			const nodes = document.querySelectorAll('.project-node');
			if (!nodes.length) return false;
			for (const node of nodes) {
				const href = (node.dataset.nodeHref || node.getAttribute('href') || '').toLowerCase();
				if (!href) continue;
				const frame = svg.querySelector(`.hand-drawn-frame[data-node-href="${href}"]`);
				if (!frame) return false;
				if (!mskProjectsMindmapFrameAlignedWithNode(frame, node, svg, container)) return false;
			}
			return true;
		} catch (_) {
			return false;
		}
	}

	function mskProjectsMindmapShouldRedrawGraphics(force) {
		if (force) return true;
		if (mskProjectsMindmapLayoutResizeMeaningful()) return true;
		return mskProjectsMindmapNeedsGraphicRebuild();
	}

	function mskShouldUsePortraitHtmlRings() {
		try {
			const container = document.querySelector('.brainstorm-container');
			return !!(
				mskIsProjectsPortraitGridDocumentMode() ||
				(container && container.classList.contains('projects-mindmap--portrait'))
			);
		} catch (_) {
			return false;
		}
	}

	function mskClearPortraitHtmlRings(container, svg) {
		try {
			if (container) {
				container
					.querySelectorAll('.msk-portrait-ring-overlay')
					.forEach((el) => el.remove());
			}
			if (svg) {
				svg
					.querySelectorAll(
						'.hand-drawn-frame, .frame-fill, .brainfarts-overlay, .brainfarts-construction-line, .brainfarts-ipad-construction-wrap, .brainfarts-ipad-construction-sign'
					)
					.forEach((el) => {
						if (el.classList.contains('mobile-mindmap-line')) return;
						el.remove();
					});
			}
		} catch (_) {}
	}

	function mskPortraitRingNavigate(e, href, targetHref) {
		if (
			e.type === 'click' &&
			(e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
		) {
			return;
		}
		try {
			e.preventDefault();
		} catch (_) {}
		try {
			e.stopPropagation();
		} catch (_) {}
		if (href.includes('brainfarts')) return;
		if (targetHref) window.location.href = targetHref;
	}

	function mskAppendPortraitHtmlRing(container, node, spec) {
		const href = (node.getAttribute('href') || '').toLowerCase();
		const targetHref = (node.getAttribute('href') || '').trim();
		let cx = parseFloat(node.dataset.mskGridCx || '');
		let cy = parseFloat(node.dataset.mskGridCy || '');
		if (!Number.isFinite(cx)) cx = parseFloat(node.style.left);
		if (!Number.isFinite(cy)) cy = parseFloat(node.style.top);
		if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

		const dx = spec.dx || 0;
		const dy = spec.dy || 0;
		const img = document.createElement('img');
		img.className =
			'msk-portrait-ring-overlay hand-drawn-frame ' + (spec.cls || '').trim();
		img.src = spec.src;
		img.alt = '';
		img.decoding = 'async';
		img.draggable = false;
		img.dataset.nodeHref = href;
		img.dataset.nodeIndex = node.dataset.nodeIndex || '';

		const rot = spec.rotate ? ` rotate(${spec.rotate}deg)` : '';
		img.style.cssText = [
			'position:absolute',
			`left:${cx + dx}px`,
			`top:${cy + dy}px`,
			`width:${spec.w}px`,
			`height:${spec.h}px`,
			`transform:translate(-50%,-50%)${rot}`,
			'transform-origin:center center',
			'pointer-events:auto',
			href.includes('brainfarts') ? 'cursor:not-allowed' : 'cursor:pointer',
			'z-index:24',
			'opacity:0.88',
			'display:block',
			'visibility:visible',
			'object-fit:fill',
			'image-rendering:crisp-edges',
		].join(';');

		img.addEventListener(
			'click',
			(e) => {
				mskPortraitRingNavigate(e, href, targetHref);
			},
			true
		);

		container.appendChild(img);
		return img;
	}

	function mskAppendPortraitRingFromIpadLockSpec(container, node, href, shrink, prs, ringBoost) {
		const lock = mskGetProjectsIpadPortraitLock();
		if (!lock || !lock.rings) return false;
		let key = null;
		if (href.includes('repop')) key = 'repop';
		else if (href.includes('naturli')) key = 'naturli';
		else if (href.includes('durex')) key = 'durex';
		else if (href.includes('unge-mod-uv')) key = 'ungeModUv';
		else if (href.includes('twister')) key = 'twister';
		else if (href.includes('kobajer')) key = 'kobajer';
		else if (href.includes('brainfarts')) key = 'brainfarts';
		else if (href.includes('byens-landhandel')) key = 'byens';
		const spec = key && lock.rings[key];
		if (!spec) return false;
		const boost = ringBoost && ringBoost > 0 ? ringBoost : 1;
		let w;
		let h;
		let dx;
		let dy;
		if (key === 'kobajer') {
			w = spec.wBase;
			h = spec.hBase;
			[w, h] = shrink(w * prs(1), h * prs(1));
			const wExtra = w * (spec.rightWMul - 1);
			w *= spec.rightWMul;
			dx = prs(spec.dxBase) - wExtra * 0.5 + prs(spec.dxNudge);
			dy = prs(spec.dy);
		} else {
			w = spec.w;
			h = spec.h;
			[w, h] = shrink(w * prs(1), h * prs(1));
			dx = prs(spec.dx || 0);
			dy = prs(spec.dy || 0);
		}
		w = Math.round(w * boost);
		h = Math.round(h * boost);
		dx = Math.round(dx * boost);
		dy = Math.round(dy * boost);
		const phonePortraitRing =
			!!(
				mskIsProjectsPhonePortraitViewport() ||
				document.documentElement.classList.contains('msk-projects-phone-portrait')
			) &&
			!mskIsProjectsTabletPortraitViewport() &&
			!document.documentElement.classList.contains('msk-projects-ipad-portrait');
		if (phonePortraitRing && key === 'byens') {
			w = Math.round(w * 0.91);
		}
		let rotate = spec.rotate;
		if (phonePortraitRing && key === 'durex') {
			w = Math.round(w * 1.36);
			h = Math.round(h * 1.4);
			rotate = (rotate || 0) - 8;
			dy += Math.round(prs(34));
		}
		if (phonePortraitRing && key === 'ungeModUv') {
			w = Math.round(w * 1.16);
			h = Math.round(h * 0.92);
			dy += Math.round(prs(18));
		}
		if (phonePortraitRing && key === 'naturli') {
			w = Math.round(w * 1.14);
			h = Math.round(h * 0.90);
		}
		if (phonePortraitRing && key === 'twister') {
			w = Math.round(w * 1.16);
			h = Math.round(h * 1.68);
			dy += Math.round(prs(14));
		}
		if (phonePortraitRing && key === 'kobajer') {
			w = Math.round(w * 1.12);
			h = Math.round(h * 1.06);
			dy += Math.round(prs(22));
		}
		mskAppendPortraitHtmlRing(container, node, {
			src: spec.src,
			w,
			h,
			dx,
			dy,
			rotate,
			cls: spec.cls,
		});
		return true;
	}

	function mskTryAppendIpadLockedPortraitRing(container, node, href, shrink, prs) {
		if (!mskUseProjectsIpadPortraitLock()) return false;
		return mskAppendPortraitRingFromIpadLockSpec(container, node, href, shrink, prs, 1);
	}

	function mskTryAppendPhonePortraitRingFromIpadLock(container, node, href, shrink, prs) {
		const phone = !!(
			mskIsProjectsPhonePortraitViewport() ||
			document.documentElement.classList.contains('msk-projects-phone-portrait')
		);
		if (
			!phone ||
			mskIsProjectsTabletPortraitViewport() ||
			document.documentElement.classList.contains('msk-projects-ipad-portrait')
		) {
			return false;
		}
		/* Telefon: større ringe så titel/badges kan sidde inde i cirklen */
		const repopRingBoost = href.includes('repop') ? 1.12 : 1;
		let ringBoost = 1.16 * repopRingBoost;
		try {
			const pf = typeof mskGetPhonePortraitProfileFactors === 'function'
				? mskGetPhonePortraitProfileFactors()
				: null;
			if (pf && pf.ringAdj) ringBoost *= pf.ringAdj;
		} catch (_) {}
		return mskAppendPortraitRingFromIpadLockSpec(container, node, href, shrink, prs, ringBoost);
	}

	function mskCreatePortraitGridRingOverlays() {
		const container = document.querySelector('.brainstorm-container');
		const svg = document.querySelector('.connecting-lines');
		const nodes = document.querySelectorAll('.project-node');
		if (!container || !nodes.length) return;

		mskClearPortraitHtmlRings(container, svg);

		const phone = !!(
			mskIsProjectsPhonePortraitViewport() ||
			document.documentElement.classList.contains('msk-projects-phone-portrait')
		);
		const ipadP = !!(
			mskIsProjectsTabletPortraitViewport() ||
			document.documentElement.classList.contains('msk-projects-ipad-portrait')
		);
		const scale = phone ? mskProjectsPortraitReferenceScale() : 1;
		const prs = (n) => n * scale;
		const phoneLockRings = phone && !ipadP;
		const shrink = (w, h) => {
			if (!phone) return [w, h];
			/* iPad-lock ringe på telefon: kun viewport-scale — ikke ekstra 0.72 shrink */
			if (phoneLockRings) return [w, h];
			const m = Math.max(0.72, scale);
			return [w * m, h * m];
		};

		nodes.forEach((node, index) => {
			node.dataset.nodeIndex = String(index);
			const href = (node.getAttribute('href') || '').toLowerCase();
			node.dataset.nodeHref = href;

			if (ipadP && mskTryAppendIpadLockedPortraitRing(container, node, href, shrink, prs)) {
				return;
			}
			if (phone && mskTryAppendPhonePortraitRingFromIpadLock(container, node, href, shrink, prs)) {
				return;
			}

			if (href.includes('repop')) {
				let w = ipadP ? 380 * 0.96 * 1.92 : 380 * 0.8 * 1.04;
				let h = ipadP ? 165 * 0.96 * 1.8 : 165 * 0.8;
				[w, h] = shrink(w * prs(1), h * prs(1));
				mskAppendPortraitHtmlRing(container, node, {
					src: 'assets/circle around repop by depop.webp',
					w,
					h,
					rotate: 180,
					cls: 'repop-image',
				});
			} else if (href.includes('naturli')) {
				let w = ipadP ? 240 * 1.82 : 240 * 0.9;
				let h = ipadP ? 140 * 1.52 : 140 * 0.9;
				[w, h] = shrink(w * prs(1), h * prs(1));
				const natHWMul = ipadP ? 1.14 : 1.1;
				w *= natHWMul;
				mskAppendPortraitHtmlRing(container, node, {
					src: "assets/cirkel omkring naturli'.webp",
					w,
					h,
					rotate: 180,
					dx: ipadP ? 10 : 6,
					dy: ipadP ? -12 : -8,
					cls: 'naturli-image',
				});
			} else if (href.includes('durex')) {
				let w = 440 * 0.98 * 0.805 * (ipadP ? 1.66 : 1);
				let h = 150 * 0.98 * 0.805 * (ipadP ? 1.84 : 1);
				[w, h] = shrink(w * prs(1), h * prs(1));
				mskAppendPortraitHtmlRing(container, node, {
					src: 'assets/circle omkring durex x guess who.webp',
					w,
					h,
					dy: ipadP ? 8 : 0,
					cls: 'durex-image',
				});
			} else if (href.includes('unge-mod-uv')) {
				let w = 320 * (ipadP ? 0.94 : 0.84) * (ipadP ? 1.82 : 1);
				let h = 150 * (ipadP ? 0.94 : 0.84) * (ipadP ? 1.52 : 1);
				[w, h] = shrink(w * prs(1), h * prs(1));
				mskAppendPortraitHtmlRing(container, node, {
					src: 'assets/unge mod uv cirkel.webp',
					w,
					h,
					cls: 'unge-mod-uv-image',
				});
			} else if (href.includes('twister')) {
				let w = 280 * 0.88 * (ipadP ? 2.24 : 1.24);
				let h = 170 * 0.88 * 0.74 * (ipadP ? 1.84 : 1.24);
				[w, h] = shrink(w * prs(1), h * prs(1));
				mskAppendPortraitHtmlRing(container, node, {
					src: 'assets/cirkel omkring twister.webp',
					w,
					h,
					dy: phone ? 20 : 12,
					cls: 'twister-image',
				});
			} else if (href.includes('kobajer')) {
				let w = 232 * 0.78 * (ipadP ? 2.02 : 1.22);
				let h =
					232 * 0.78 * 0.74 * (ipadP ? 1.48 : 1.16) * (ipadP ? 1.76 : 1.52);
				[w, h] = shrink(w * prs(1), h * prs(1));
				const kobRightWMul = ipadP ? 1.1 : 1.08;
				const wExtra = w * (kobRightWMul - 1);
				w *= kobRightWMul;
				mskAppendPortraitHtmlRing(container, node, {
					src: 'assets/cirkel købajer.webp',
					w,
					h,
					rotate: 180,
					dx: (ipadP ? -18 : -10) - wExtra * 0.5 + (ipadP ? 14 : 10),
					dy: ipadP ? -64 : -30,
					cls: 'kobajer-image',
				});
			} else if (href.includes('brainfarts')) {
				let w = 240 * 0.78 * (ipadP ? 3.02 : 1);
				let h = 200 * 0.78 * (ipadP ? 1.8 : 1);
				[w, h] = shrink(w * prs(1), h * prs(1));
				mskAppendPortraitHtmlRing(container, node, {
					src: 'assets/cirkel om brainfarts.webp',
					w,
					h,
					cls: 'brainfarts-image',
				});
			} else if (href.includes('byens-landhandel')) {
				let w = 440 * 0.78 * (ipadP ? 2.55 : 1.22);
				let h = 170 * 0.78 * 0.94 * (ipadP ? 1.5 : 1);
				[w, h] = shrink(w * prs(1), h * prs(1));
				mskAppendPortraitHtmlRing(container, node, {
					src: 'assets/circle omkring byens landhandel.webp',
					w,
					h,
					dy: ipadP ? -14 : 0,
					cls: 'byens-landhandel-image',
				});
			}
		});
	}

	function mskProjectsMindmapPortraitFramesReady() {
		try {
			if (!mskIsProjectsPortraitTouchGridMode()) return true;
			const container = document.querySelector('.brainstorm-container');
			if (!container) return false;
			const nodes = document.querySelectorAll('.project-node');
			if (!nodes.length) return false;
			if (mskShouldUsePortraitHtmlRings()) {
				const rings = container.querySelectorAll(
					'.msk-portrait-ring-overlay.hand-drawn-frame'
				);
				return rings.length >= nodes.length;
			}
			const svg = document.querySelector('.connecting-lines');
			if (!svg || !container) return false;
			for (const node of nodes) {
				const href = (node.dataset.nodeHref || node.getAttribute('href') || '').toLowerCase();
				if (!href) continue;
				const frame = svg.querySelector(`.hand-drawn-frame[data-node-href="${href}"]`);
				if (!frame) return false;
				if (!mskProjectsMindmapFrameAlignedWithNode(frame, node, svg, container)) return false;
			}
			return true;
		} catch (_) {
			return false;
		}
	}

	function mskProjectsMindmapMarkGraphicsBuilt() {
		try {
			const svg = document.querySelector('.connecting-lines');
			if (!svg) return;
			if (!mskProjectsMindmapPortraitFramesReady()) return;
			if (!mskProjectsMindmapIpadLandscapeFramesReady()) return;
			svg.dataset.mskDynamicGraphicsBuilt = '1';
		} catch (_) {}
	}

	function mskProjectsMindmapReveal() {
		try {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			document.documentElement.classList.remove('msk-mindmap-booting');
			document.documentElement.classList.add('msk-projects-mindmap-painted');
			if (container.dataset.mskRevealed === '1') return;
			container.dataset.mskRevealed = '1';
			try {
				mskSyncBrainfartsIpadConstructionSignOpacity();
			} catch (_) {}
		} catch (_) {}
	}

	// Brain animations and connecting lines
	function initBrainAnimations() {
		if (!document.body || !document.body.classList.contains('projects-page')) return;
		mskEnsureProjectsPhonePortraitCanvasMode();
		const isPreview = document.documentElement.classList.contains('transition-preview');
		try {
			if (
				!isPreview &&
				!document.documentElement.classList.contains('msk-projects-mindmap-painted') &&
				mskIsProjectsTabletLandscapeViewport()
			) {
				document.documentElement.classList.add('msk-mindmap-booting');
			}
		} catch (_) {}
		const brain = document.querySelector('.brain');
		const nodes = document.querySelectorAll('.project-node');
		const pupils = document.querySelectorAll('.pupil');
		const mouth = document.querySelector('.brain-mouth');
		const svg = document.querySelector('.connecting-lines');
		const fartLayer = document.querySelector('.fart-layer');
		
		console.log('Initializing brain animations...');
		console.log('Found nodes:', nodes.length);
		console.log('Node elements:', nodes);
		
		if (!brain || !nodes.length) {
			console.log('Missing brain or nodes. Brain:', brain, 'Nodes count:', nodes.length);
			// When navigating to "projekter", the section may appear after initial load.
			// Retry a few times so the assets/lines (incl. arrows) don't "disappear".
			const tries = Number(document.documentElement.dataset.brainInitTries || '0');
			if (tries < 10) {
				document.documentElement.dataset.brainInitTries = String(tries + 1);
				window.setTimeout(initBrainAnimations, 200);
			}
			return;
		}

		function svgCenterFromRect(svgEl, domRect, containerRect) {
			return mskSvgCenterFromRect(svgEl, domRect, containerRect);
		}

		// If we've already bound listeners once, just re-position/redraw.
		if (brain.dataset.animInit === '1') {
			try {
				// Refresh pass to ensure custom assets are present after navigation.
				positionNodesPerfectCircle();
				refreshProjectsMindmapStandaloneExtras();
				mskProjectsSyncLayoutBeforePaint();
				const portraitTouch = mskIsProjectsPortraitTouchGridMode();
				if (portraitTouch || mskProjectsMindmapShouldRedrawGraphics(false)) {
					const redrawOpts = { force: true };
					try {
						const svg = document.querySelector('.connecting-lines');
						if (svg) delete svg.dataset.mskDynamicGraphicsBuilt;
					} catch (_) {}
					createConnectingLines(redrawOpts);
					createHandDrawnFrames(redrawOpts);
					mskProjectsMindmapMarkGraphicsBuilt();
				}
				positionBrainfartsBuildNote();
				try {
					mskApplyBrainfartsIpadLandscapeConstructionSign();
					mskSyncBrainfartsIpadConstructionSignOpacity();
				} catch (_) {}
				mskProjectsMindmapReveal();
			} catch {}
			if (isPreview) {
				try {
					const container = document.querySelector('.brainstorm-container');
					if (container) container.classList.add('preview-ready');
				} catch {}
			}
			return;
		}

		// After portrait → landscape/wide: fuld reset af alt JS/HTML har sat inline,
		// så ellipse + badges + linjer matcher cold load (ikke kun hjernen).
		function clearProjectsMindmapPortraitInlineStylesForEllipseLayout() {
			const container = document.querySelector('.brainstorm-container');
			try {
				brain.removeAttribute('style');
			} catch {}
			try {
				Array.from(nodes).forEach((node) => {
					try {
						node.removeAttribute('style');
						const title = node.querySelector('.project-node__title');
						if (title) title.removeAttribute('style');
						node.querySelectorAll('.node-label').forEach((el) => el.removeAttribute('style'));
						node
							.querySelectorAll(
								'.dandd-badge--inline, .kravling-nomineret-badge--inline, .kobajer-kravling-2024-badge--inline'
							)
							.forEach((el) => el.remove());
						const bfSign = node.querySelector('.brainfarts-build__sign--inline');
						if (bfSign) bfSign.remove();
					} catch {}
				});
			} catch {}
			if (!container) return;
			try {
				[
					'.repop-kravling-line',
					'.twister-dandd-line',
					'.kobajer-arrow',
					'.dandd-badge',
					'.kravling-nomineret-badge',
					'.kobajer-kravling-2024-badge',
				].forEach((sel) => {
					container.querySelectorAll(sel).forEach((el) => {
						try {
							el.removeAttribute('style');
						} catch {}
					});
				});
			} catch {}
		}

		/** Kun inline D&AD i TWISTER: skjul fritliggende badge + connector (kalde EFTER ensureProjectsMobileInlineBadges). */
		function hideStandaloneDandDForProjectsMindmapPortrait(container) {
			try {
				if (!container || !document.body.classList.contains('projects-page')) return;
				const tw = container.querySelector('a[href*="twister"], .project-node[href*="twister"]');
				const hasTwisterInline = !!(tw && tw.querySelector('.dandd-badge--inline'));
				const portraitGrid = container.classList.contains('projects-mindmap--portrait');
				if (!hasTwisterInline && !portraitGrid) return;
				const badge = container.querySelector('.dandd-badge:not(.dandd-badge--inline)');
				if (badge) badge.style.setProperty('display', 'none', 'important');
				const line = container.querySelector('.twister-dandd-line');
				if (line) line.style.setProperty('display', 'none', 'important');
			} catch (_) {}
		}

		/** Portræt-grid: skjul ellipse-only DOM (pil, D&AD-badge, radiale streger) der skaber overlap på mobil. */
		function mskHideProjectsPortraitEllipseExtras(container) {
			try {
				if (!container) return;
				if (
					!container.classList.contains('projects-mindmap--portrait') &&
					!mskIsProjectsPortraitGridDocumentMode()
				) {
					return;
				}
				try {
					container.classList.add('projects-mindmap--portrait');
				} catch (_) {}
				const hide = (sel) => {
					container.querySelectorAll(sel).forEach((el) => {
						try {
							el.style.setProperty('display', 'none', 'important');
							el.style.setProperty('visibility', 'hidden', 'important');
							el.style.setProperty('opacity', '0', 'important');
						} catch (_) {}
					});
				};
				hide('.twister-dandd-line');
				hide('.repop-kravling-line');
				hide('.kobajer-arrow');
				hide('.dandd-badge:not(.dandd-badge--inline)');
				hide('.brainfarts-build');
				hide('.brainfarts-build__arrow');
				const svg = container.querySelector('.connecting-lines');
				if (svg) {
					svg.querySelectorAll('.brainfarts-brain-line').forEach((el) => {
						try {
							el.remove();
						} catch (_) {}
					});
				}
			} catch (_) {}
		}

		function refreshProjectsMindmapStandaloneExtras() {
			const bc = document.querySelector('.brainstorm-container');
			ensureProjectsMobileInlineBadges();
			if (bc && (bc.classList.contains('projects-mindmap--portrait') || mskIsProjectsPortraitGridDocumentMode())) {
				try {
					bc.classList.add('projects-mindmap--portrait');
				} catch (_) {}
				hideStandaloneDandDForProjectsMindmapPortrait(bc);
				mskHideProjectsPortraitEllipseExtras(bc);
				return;
			}
			createAndPositionDandDLogo();
			createAndPositionTwisterDandDLine();
			createAndPositionRepopKravlingLine();
			createAndPositionKravlingNomineretBadge();
			createAndPositionKobajerArrow();
			hideStandaloneDandDForProjectsMindmapPortrait(bc);
		}

		function applyMindmapLineImgBaseStyles(img) {
			if (!img) return;
			img.style.position = 'absolute';
			img.style.pointerEvents = 'none';
			img.style.zIndex = '12';
			img.style.display = 'block';
			img.style.imageRendering = 'crisp-edges';
			img.style.filter = 'none';
		}

		function applyKobajerArrowBaseStyles(arrow) {
			if (!arrow) return;
			arrow.style.position = 'absolute';
			arrow.style.pointerEvents = 'none';
			arrow.style.zIndex = '20';
			arrow.style.display = 'block';
			arrow.style.imageRendering = 'crisp-edges';
			arrow.style.filter = 'none';
		}

		// Position all project nodes in a perfect circle around the brain.
		// This overrides the hand-tuned % positions in the HTML so everything is evenly spaced.
		function positionNodesPerfectCircle() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;

			const hadPortraitArtifactsBeforeMode = mskProjectsMindmapHasPortraitGridArtifacts();

			mskEnsureProjectsPhonePortraitCanvasMode();

			const forceIpadLandscapeEllipse = mskApplyProjectsIpadLandscapeDocumentMode();
			const ipadDocEllipse = !!forceIpadLandscapeEllipse;
			if (ipadDocEllipse && hadPortraitArtifactsBeforeMode) {
				mskProjectsMindmapClearPortraitGridArtifacts();
			}
			if (ipadDocEllipse) {
				try {
					container.classList.remove('projects-mindmap--portrait');
				} catch (_) {}
			}

			const containerRectForLayout = container.getBoundingClientRect();
			const lv = mskProjectsLayoutViewportBox();
			const vis = mskProjectsVisibleViewportPx();
			const iw = vis.w;
			const ih = vis.h;
			let tabletLandscapeLayout = false;
			try {
				tabletLandscapeLayout = !!mskIsProjectsTabletLandscapeViewport();
			} catch (_) {
				tabletLandscapeLayout = false;
			}
			const scrollLockLandscape =
				document.documentElement.classList.contains('msk-projects-ipad-landscape-no-scroll') &&
				tabletLandscapeLayout;
			/*
			 * Fixed fullscreen-container: clientHeight kan følge oppustet dokument (papir min-height)
			 * eller kollapse til 0 når html/body er position:fixed → tom/scrollable side.
			 * iPad landskab: brug altid synlig viewport (inner*), ikke container.clientHeight.
			 */
			let layoutW;
			let layoutH;
			let portraitSketchGridLayout = false;
			try {
				portraitSketchGridLayout = mskIsProjectsPortraitGridDocumentMode();
			} catch (_) {
				portraitSketchGridLayout = false;
			}
			const phonePortraitScrollLock = document.documentElement.classList.contains(
				'msk-projects-phone-portrait-no-scroll'
			);
			if (tabletLandscapeLayout || scrollLockLandscape || ipadDocEllipse) {
				const dim = mskProjectsTabletLandscapeLayoutPx();
				layoutW = dim.w;
				layoutH = dim.h;
			} else if (
				portraitSketchGridLayout ||
				phonePortraitScrollLock ||
				mskIsProjectsPortraitGridDocumentMode()
			) {
				const pv = mskProjectsPortraitGridLayoutPx();
				layoutW = pv.w;
				layoutH = pv.h;
			} else {
				const rawCW = container.clientWidth || containerRectForLayout.width || lv.w;
				let rawCH = container.clientHeight || containerRectForLayout.height || lv.h;
				if (rawCH > ih * 1.35) rawCH = ih;
				layoutW = Math.round(Math.max(1, Math.min(iw, rawCW)));
				layoutH = Math.round(Math.max(1, Math.min(ih, rawCH)));
			}
			/* Aldrig layout højere end viewport — undtagen telefon-canvas (768×1024 reference) */
			if (document.body && document.body.classList.contains('projects-page')) {
				layoutW = Math.round(Math.max(1, Math.min(layoutW, iw)));
				layoutH = Math.round(Math.max(1, Math.min(layoutH, ih)));
			}
			const w = layoutW;
			const h = layoutH;
			let narrow = false;
			try {
				narrow = !!(window.matchMedia && window.matchMedia('(max-width: 640px)').matches) || (w > 0 && w <= 640);
			} catch {}
			/* Kort phone landscape: brug samme ellipse som desktop (padding/minRx/extraRy), ikke "narrow phone"-ring */
			let isShortLandscape = false;
			try {
				isShortLandscape = mskIsProjectsShortLandscapeViewport();
			} catch {}
			try {
				if (isShortLandscape) narrow = false;
			} catch {}

			let touchLandscape = false;
			try {
				if (window.matchMedia) {
					touchLandscape = !!window.matchMedia('(max-width: 1024px) and (orientation: landscape) and (hover: none) and (pointer: coarse)').matches;
				}
			} catch {}
			try {
				if (!touchLandscape && mskIsProjectsShortLandscapeViewport()) touchLandscape = true;
			} catch {}
			/* Touch-landscape layout-tweaks (flad ry, mindre padding) — ikke i kort landscape; dér følger vi desktop */
			let touchLayout = touchLandscape && !isShortLandscape;

			const nodeArray = Array.from(nodes);

			const cw = layoutW;
			/* Under rotation kan clientWidth/Height kort give ih<iw selv i portræt — orientation media matcher CSS */
			let portraitOrientation = false;
			let landscapeOrientation = false;
			try {
				portraitOrientation = !!(window.matchMedia && window.matchMedia('(orientation: portrait)').matches);
				landscapeOrientation = !!(window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
			} catch (_) {
				portraitOrientation = false;
				landscapeOrientation = false;
			}
			/* Kun smal telefon: aspect-fallback — ikke tablet (fx byttede mål 1024×1366 i landskab gav portræt-grid) */
			if (!portraitOrientation && ih >= iw && cw <= 640) portraitOrientation = true;
			if (landscapeOrientation || mskIsProjectsTabletLandscapeViewport()) portraitOrientation = false;
			let phonePortraitMedia = false;
			try {
				phonePortraitMedia = !!(
					window.matchMedia &&
					window.matchMedia('(max-width: 640px) and (orientation: portrait)').matches
				);
			} catch (_) {}
			const portraitGridMode =
				!ipadDocEllipse &&
				!forceIpadLandscapeEllipse &&
				document.body &&
				document.body.classList.contains('projects-page') &&
				!mskIsProjectsTabletLandscapeViewport() &&
				!mskIsProjectsShortLandscapeViewport() &&
				(mskIsProjectsPortraitSketchGridViewport() ||
					document.documentElement.classList.contains('msk-projects-phone-portrait') ||
					document.documentElement.classList.contains('msk-projects-ipad-portrait') ||
					(iw <= 640 && ih > iw + 8));

			const phonePortraitGrid =
				portraitGridMode &&
				(mskIsProjectsPhonePortraitViewport() ||
					document.documentElement.classList.contains('msk-projects-phone-portrait'));

			let phoneProfile = null;
			if (phonePortraitGrid) {
				try {
					if (typeof mskApplyPhonePortraitProfileDocument === 'function') {
						phoneProfile = mskApplyPhonePortraitProfileDocument(layoutW, layoutH);
					} else if (typeof mskGetPhonePortraitProfileFactors === 'function') {
						phoneProfile = mskGetPhonePortraitProfileFactors(layoutW, layoutH);
					}
				} catch (_) {
					phoneProfile = null;
				}
			}
			const phoneRowSpanAdj = phoneProfile?.rowSpanAdj ?? 1;
			const phoneRowVertMul = phoneProfile?.rowVertMul ?? 1;
			const phoneSafeMarginAdj = phoneProfile?.safeMarginAdj ?? 1;
			const phoneColInsetAdj = phoneProfile?.colInsetAdj ?? 1;
			const phoneNudgeMul = phoneProfile?.nudgeMul ?? 1;
			const phoneNodeMaxVw = phoneProfile?.nodeMaxVw ?? 42;

			/* Telefon: samme grid-tal som iPad portræt-lock, skaleret til smal viewport */
			const scale = portraitGridMode
				? phonePortraitGrid
					? mskProjectsPortraitReferenceScale()
					: Math.max(0.46, Math.min(1, (layoutW || cw || 375) / 768))
				: 1;

			// Portrait mobile: 5-row sketch layout (2+2+brain+2+2) — identisk telefon + iPad portræt.
			if (portraitGridMode) {
				try { container.classList.add('projects-mindmap--portrait'); } catch {}
					layoutW = Math.round(Math.max(1, window.innerWidth || layoutW || 375));
					layoutH = Math.round(Math.max(1, window.innerHeight || layoutH || 667));
					const brainEl = brain || container.querySelector('.brain');
					let NAV_H = 52;
					try {
						const nb = document.querySelector('.navbar');
						if (nb && nb.getBoundingClientRect) NAV_H = Math.round(nb.getBoundingClientRect().bottom);
					} catch {}
					const pvBand = mskProjectsPortraitGridLayoutPx();
					const capH = Math.min(pvBand.h || layoutH || ih, ih, layoutH || ih);
					const portraitBandH = capH > 0 ? capH : Math.min(layoutH, ih);
					// Nodes use translate(-50%,-50%); row Y is the *center*. Margins + compressed band so the map fits portrait height.
					const phoneGridLock = phonePortraitGrid ? mskGetProjectsIpadPortraitLock()?.grid : null;
					const safeTop = NAV_H + Math.round((phonePortraitGrid ? 28 : 36) * scale * phoneSafeMarginAdj);
					let safeBottom =
						portraitBandH -
						Math.round((phonePortraitGrid ? 28 : 40) * scale * phoneSafeMarginAdj) -
						mskSafeAreaInsetBottomPx();
					if (safeBottom < safeTop + 120) {
						safeBottom = portraitBandH - Math.round((phonePortraitGrid ? 28 : 40) * scale * phoneSafeMarginAdj);
					}
					const edgePad = Math.max(
						18,
						Math.round((phonePortraitGrid ? 40 : 52) * scale * phoneSafeMarginAdj)
					);
					const minX = edgePad;
					const maxX = layoutW - edgePad;
					const colLeftMul = phonePortraitGrid ? 0.22 + (1 - phoneColInsetAdj) * 0.04 : 0.22;
					const colRightMul = phonePortraitGrid ? 0.78 - (1 - phoneColInsetAdj) * 0.04 : 0.78;
					const baseLeft = Math.max(
						minX,
						Math.min(maxX, layoutW * colLeftMul)
					);
					const baseRight = Math.max(
						minX,
						Math.min(maxX, layoutW * colRightMul)
					);
					const phoneRingMul = phonePortraitGrid ? 1 : 0.72;
					let maxW = Math.min(
						Math.floor((phonePortraitGrid ? 300 * phoneRingMul : 300) * scale),
						Math.max(
							72,
							Math.floor(
								layoutW *
									(phonePortraitGrid ? (phoneNodeMaxVw / 100) * phoneRingMul : 0.42)
							)
						)
					);
					const nudgeMul = phonePortraitGrid ? phoneNudgeMul : 1;
					const tilts = [-1, 1, -2, 0.5, -1.5, 2, -0.5, 1.5];

					const rowOffsets = [
						Math.round(-14 * scale),
						Math.round(-14 * scale),
						0,
						Math.round(-10 * scale),
						Math.round(-14 * scale),
					];

					function rowXs(rowIndex) {
						const off = rowOffsets[rowIndex - 1] ?? 0;
						let lx = baseLeft + off;
						let rx = baseRight - off;
						lx = Math.max(minX, Math.min(maxX, lx));
						rx = Math.max(minX, Math.min(maxX, rx));
						if (rx - lx < 150) {
							const mid = (lx + rx) / 2;
							lx = Math.max(minX, mid - 75);
							rx = Math.min(maxX, mid + 75);
						}
						return { lx, rx };
					}

					const portraitGridLiftY = phonePortraitGrid
						? Math.round((phoneGridLock?.liftY ?? 24) * scale)
						: Math.round(
								(mskUseProjectsIpadPortraitLock()
									? (mskGetProjectsIpadPortraitLock().grid.liftY || 24)
									: 24) * scale
							);

					function rowY(rowIndex) {
						const pad = Math.round(4 * scale);
						const y1 = safeTop + pad;
						const y5 = safeBottom - pad;
						const full = y5 - y1;
						const rowSpanMul = phonePortraitGrid
							? (phoneGridLock?.rowSpanMul ?? 0.88) * phoneRowSpanAdj
							: mskUseProjectsIpadPortraitLock()
								? (mskGetProjectsIpadPortraitLock().grid.rowSpanMul || 0.88)
								: 0.88;
						const span = full * rowSpanMul;
						const mid = (y1 + y5) / 2;
						const y1c = mid - span / 2;
						const step = span / 4;
						return y1c + (rowIndex - 1) * step - portraitGridLiftY;
					}

					function styleNode(node, tiltIndex) {
						node.style.setProperty('position', 'absolute', 'important');
						node.style.setProperty('right', 'auto', 'important');
						node.style.setProperty('bottom', 'auto', 'important');
						node.style.setProperty('margin-left', '0', 'important');
						node.style.setProperty('margin-top', '0', 'important');
						node.style.setProperty('max-width', `${maxW}px`, 'important');
						node.style.setProperty('text-align', 'center', 'important');
						node.style.setProperty('white-space', 'normal', 'important');
						node.style.setProperty('line-height', '1.05', 'important');
						node.style.setProperty(
							'transform',
							`translate(-50%, -50%) rotate(${tilts[tiltIndex % tilts.length] ?? 0}deg)`,
							'important'
						);
					}

					const plan = [
						{ key: 'repop', row: 1, side: 'left', match: (h) => h.includes('repop') },
						{ key: 'naturli', row: 1, side: 'right', match: (h) => h.includes('naturli') },
						{ key: 'durex', row: 2, side: 'left', match: (h) => h.includes('durex') },
						{ key: 'unge', row: 2, side: 'right', match: (h) => h.includes('unge-mod-uv') },
						{ key: 'twister', row: 4, side: 'left', match: (h) => h.includes('twister') },
						{ key: 'kobajer', row: 4, side: 'right', match: (h) => h.includes('kobajer') },
						{ key: 'brainfarts', row: 5, side: 'left', match: (h) => h.includes('brainfarts') },
						{ key: 'byens', row: 5, side: 'right', match: (h) => h.includes('byens-landhandel') },
					];

					const placed = [];
					for (let i = 0; i < plan.length; i++) {
						const p = plan[i];
						const node = nodeArray.find((n) => p.match((n.getAttribute('href') || '').toLowerCase()));
						if (!node) continue;
						styleNode(node, i);
						if (phonePortraitGrid && p.key === 'repop') {
							const repopMaxW = Math.min(
								Math.floor(maxW * 1.16),
								Math.max(72, Math.floor(layoutW * 0.46))
							);
							node.style.setProperty('max-width', `${repopMaxW}px`, 'important');
						}
						if (p.key === 'durex' || p.key === 'unge') {
							const fs = parseFloat(window.getComputedStyle(node).fontSize) || 16;
							node.style.setProperty('font-size', `${Math.max(10, fs * 0.86)}px`, 'important');
						}
						if (p.key === 'brainfarts' || p.key === 'byens') {
							node.style.setProperty('width', 'auto', 'important');
							node.style.setProperty('min-width', '0', 'important');
						}
						let y = rowY(p.row);
						if (p.key === 'repop') y -= Math.round(8 * scale);
						if (p.key === 'kobajer') y -= Math.round(6 * scale);
						const { lx, rx } = rowXs(p.row);
						let x = (p.side === 'left') ? lx : rx;
						if (p.key === 'kobajer') y += Math.round(40 * scale * nudgeMul);
						/* Brainfarts: lidt mod højre så boblen ikke klipper i venstre kant */
						if (p.key === 'brainfarts') x += Math.round(32 * scale * nudgeMul);
						/* Twister: mod højre + lidt højere (cirkel + indhold, kun portræt-grid) */
						if (p.key === 'twister') {
							x += Math.round(28 * scale * nudgeMul);
							y -= Math.round(12 * scale);
						}
						/* Repop: mod højre så boblen + Kravling ikke klipper i venstre kant */
						if (p.key === 'repop') x += Math.round(28 * scale * nudgeMul);
						/* Byens: træk mod venstre så cirkel + tekst ikke klipper i højre kant */
						if (p.key === 'byens') x -= Math.round(38 * scale * nudgeMul);
						/* Alt under hjernen (række 4–5): endnu tættere på hjernen (kun portræt-grid) */
						if (p.row >= 4) y -= Math.round(22 * scale);
						if (p.row === 5) y -= Math.round(18 * scale);
						// Wide charcoal circle + translate(-50%): keep center inset so the left edge stays on-screen.
						if (p.key === 'durex') x += Math.round(38 * scale * nudgeMul);
						if (phonePortraitGrid && p.key === 'durex') {
							x += Math.round(20 * scale);
						}
						// Right column: pull toward center so the circle fits (smaller asset + translate -50%).
						if (p.key === 'unge') x -= Math.round(28 * scale * nudgeMul);
						/* Øverste rækker (over hjernen): finjuster mod hjernen (mindre ned = højere op på skærmen) */
						if (p.row <= 2) y += Math.round(12 * scale);
						/* Række 1 (Repop + Naturlig) */
						if (p.row === 1) y += Math.round(4 * scale);
						/* Repop: ekstra i portrait-grid (kun denne node, ikke Naturlig) */
						if (p.key === 'repop' && !phonePortraitGrid) y += Math.round(10 * scale);
						/* Telefon portræt: Repop/Kravling op i række-1-cirklen (tekst sad under ringen) */
						if (phonePortraitGrid && p.key === 'repop') {
							y -= Math.round(10 * scale);
						}
						/* Telefon portræt: øverste række (Repop + Naturli) + streger ned */
						if (phonePortraitGrid && p.row === 1) {
							y += Math.round(52 * scale * phoneRowVertMul);
						}
						/* Telefon portræt: øverste cirkler tættere mod midten vandret */
						if (phonePortraitGrid && p.row === 1) {
							if (p.key === 'repop') x += Math.round(20 * scale);
							if (p.key === 'naturli') x -= Math.round(20 * scale);
						}
						/* Telefon portræt: nederste cirkler tættere mod midten vandret */
						if (phonePortraitGrid && p.row === 5) {
							if (p.key === 'brainfarts') x += Math.round(20 * scale);
							if (p.key === 'byens') x -= Math.round(20 * scale);
						}
						/* Nederste række (Brainfarts, Byens): lidt ned — cirkler + indhold; streger følger i createConnectingLines */
						if (p.key === 'brainfarts' || p.key === 'byens') {
							y += Math.round(50 * scale * nudgeMul * phoneRowVertMul);
						}
						let tabletPortrait = false;
						try {
							tabletPortrait = !!mskIsProjectsTabletPortraitViewport();
						} catch (_) {
							tabletPortrait = false;
						}
						/* iPad + telefon portræt: Kø-Bajer noden lidt ned (låst værdi i lock-fil) */
						if ((tabletPortrait || phonePortraitGrid) && p.key === 'kobajer') {
							const kobExtraY = mskGetProjectsIpadPortraitLock()?.grid?.kobajerNodeExtraY || 16;
							y += Math.round(kobExtraY * scale);
						}
						/* Telefon portræt: Kø-Bajer cirkel + tekst lidt mod højre */
						if (phonePortraitGrid && p.key === 'kobajer') {
							x += Math.round(28 * scale);
						}
						x = Math.max(minX, Math.min(maxX, x));
						node.style.setProperty('left', `${x}px`, 'important');
						node.style.setProperty('top', `${y}px`, 'important');
						try {
							node.dataset.mskGridCx = String(Math.round(x));
							node.dataset.mskGridCy = String(Math.round(y));
						} catch (_) {}
						placed.push(node);
					}

					try {
						let portraitGridBrain = portraitGridMode || mskIsProjectsPortraitGridDocumentMode();
						if (brainEl) {
							brainEl.style.setProperty('position', 'absolute', 'important');
							if (portraitGridBrain) {
								brainEl.style.setProperty('left', `${Math.round(layoutW / 2)}px`, 'important');
								let brainY = Math.round(rowY(3));
								if (phonePortraitGrid) {
									const brainVertMul =
										phoneProfile && phoneProfile.hRatio < 1
											? 0.82 + 0.18 * phoneProfile.hRatio
											: 1;
									brainY += Math.round(34 * scale * brainVertMul);
								}
								brainEl.style.setProperty('top', `${brainY}px`, 'important');
							} else {
								brainEl.style.setProperty('left', 'calc(50% + 30px)', 'important');
								brainEl.style.setProperty('top', 'calc(50% + 42px)', 'important');
							}
							brainEl.style.setProperty('right', 'auto', 'important');
							brainEl.style.setProperty('bottom', 'auto', 'important');
							brainEl.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
						}
					} catch {}

					try {
						const y1 = rowY(1);
						const y2 = rowY(2);
						const step = Math.max(40, y2 - y1);
						let maxH = 0;
						placed.forEach((n) => {
							const r = n.getBoundingClientRect();
							if (r && r.height) maxH = Math.max(maxH, r.height);
						});
						if (maxH > step * 0.92) {
							const k = Math.max(0.82, Math.min(1, (step * 0.92) / maxH));
							placed.forEach((n) => {
								const fs = parseFloat(window.getComputedStyle(n).fontSize) || 16;
								n.style.setProperty('font-size', `${Math.max(10, fs * k)}px`, 'important');
							});
						}
					} catch {}

					ensureProjectsMobileInlineBadges();
					hideStandaloneDandDForProjectsMindmapPortrait(container);
					mskHideProjectsPortraitEllipseExtras(container);
					mskApplyProjectsPortraitPhoneCanvasStyles();
					return;
				}

			const enteringTabletEllipse =
				hadPortraitArtifactsBeforeMode ||
				container.classList.contains('projects-mindmap--portrait');
			try {
				container.classList.remove('projects-mindmap--portrait');
			} catch {}
			if (enteringTabletEllipse && (tabletLandscapeLayout || scrollLockLandscape || ipadDocEllipse)) {
				mskProjectsMindmapClearPortraitGridArtifacts();
				clearProjectsMindmapPortraitInlineStylesForEllipseLayout();
				try {
					void brain.offsetHeight;
				} catch {}
			}

			/* Ellipse: mål hjernens centrum EFTER portrait-inline er væk — ellers matcher rotation ikke cold load i landscape. */
			const containerRect = container.getBoundingClientRect();
			const brainRect = brain.getBoundingClientRect();
			const svgForLayout = document.querySelector('.connecting-lines');
			const brainCenter = svgCenterFromRect(svgForLayout, brainRect, containerRect);
			let centerX = Math.round(brainCenter.x);
			let centerY = Math.round(brainCenter.y);

			let tabletLandscape = !!ipadDocEllipse || !!forceIpadLandscapeEllipse;
			try {
				if (!tabletLandscape) tabletLandscape = !!mskIsProjectsTabletLandscapeViewport();
			} catch (_) {
				tabletLandscape = !!ipadDocEllipse;
			}
			if (tabletLandscape) touchLayout = false;
			if (tabletLandscape) {
				let navH = 52;
				try {
					const nb = document.querySelector('.navbar');
					if (nb && nb.getBoundingClientRect) navH = Math.round(nb.getBoundingClientRect().bottom);
				} catch (_) {}
				const bandTop = navH + Math.round(12 * scale);
				const bandBottom = layoutH - Math.round(12 * scale);
				centerY = Math.round((bandTop + bandBottom) / 2) - MSK_PROJECTS_IPAD_LS_LAYOUT_UP_PX;
				centerX = Math.round(layoutW / 2) - MSK_PROJECTS_IPAD_LS_LAYOUT_LEFT_PX;
				try {
					brain.style.setProperty('position', 'absolute', 'important');
					brain.style.setProperty('left', `${centerX}px`, 'important');
					brain.style.setProperty('top', `${centerY}px`, 'important');
					brain.style.setProperty('right', 'auto', 'important');
					brain.style.setProperty('bottom', 'auto', 'important');
					brain.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
				} catch (_) {}
			}

			// Use an ellipse ring (rx > ry). On phones, drop the desktop min radius (200px) or left/right nodes clip off-screen.
			/* Mindre side-padding → større rx → ringen bredere mod venstre/højre */
			let paddingX = 165;
			let paddingY = 215;
			let extraRy = 120;
			let minRx = 200;
			let minRy = 170;
			if (tabletLandscape) {
				/* iPad landskab: stor ellipse — bruger både bredde og højde på åben notesbog */
				paddingX = 172;
				paddingY = 152;
				extraRy = 0;
				minRx = 128;
				minRy = 118;
			}
			if (narrow) {
				paddingX = Math.max(36, w * 0.10);
				paddingY = Math.max(42, h * 0.09);
				extraRy = 0;
				minRx = 48;
				minRy = 48;
			}
			/* Bred landscape (fx tablet), ikke kort phone landscape: mindre side-padding → større rx */
			if (touchLayout && w > h && !narrow) {
				paddingX = Math.min(paddingX, 64);
			}
			let rx = Math.max(minRx, (w / 2) - paddingX);
			let ry = Math.max(minRy, (h / 2) - paddingY) + extraRy;
			if (tabletLandscape) {
				ry = Math.min(ry, Math.max(minRy, layoutH * 0.39));
				rx = Math.min(rx, layoutW * 0.41);
				/* Bred notesbog: lidt bredere end høj (typisk rx/ry ≈ 1.18 på 1366×1024) */
				rx = Math.max(rx, Math.round(ry * 1.18));
				rx = Math.min(rx, layoutW * 0.41);
			}
			if (narrow) {
				const capX = Math.max(64, w * 0.36);
				const capY = Math.max(72, h * 0.36);
				rx = Math.min(rx, capX);
				ry = Math.min(ry, capY);
			}
			/* Lav landscape (tablet m.m.): flad ry — spring over i kort landscape (desktop ellipse) */
			try {
				if (touchLayout && w > h) {
					const flatRy =
						!narrow && mskIsProjectsShortLandscapeViewport()
							? Math.max(195, h * 0.64)
							: Math.max(152, h * 0.44);
					ry = Math.min(ry, flatRy);
				}
			} catch {}
			/* Kort landscape: begræns kun lodret radius (top/bund). Horisontalt: udvid ringen så den bruger bredden
			   (tidligere min(rx, rxTight) trykkede rx ned til ~158px og stablede knapper i midten). */
			try {
				if (isShortLandscape && !narrow) {
					/* Lodret: lidt højere bue så top/bund bruger mere af højden — samme node-/ring-størrelse (kun placering) */
					ry = Math.min(ry, Math.max(138, h * 0.54));
					/* Vandret: scale(MSK_PROJECTS_LANDSCAPE_FIT) — layout-rx skal være højere end w/2 for synlig bredde, men fuld
					   (vw/2)/fit klippede sidebobler (titler rækker ud). Bland mod rx fra padding ovenfor. */
					try {
						const innerMax = Math.max(window.innerWidth || 0, window.innerHeight || 0);
						const vw = Math.max(1, w, innerMax, lv.w, lv.h);
						let fit = MSK_PROJECTS_LANDSCAPE_FIT;
						try {
							const cs = window.getComputedStyle(container);
							const v = parseFloat(cs.getPropertyValue('--projectsLandscapeFit') || '');
							if (Number.isFinite(v) && v >= 0.25 && v <= 1) fit = v;
						} catch (_) {}
						const edgePad = 18;
						const rxLo = rx;
						const rxFull = Math.max(40, (vw / 2 - edgePad) / fit);
						const rxBlend = 0.56;
						rx = Math.max(rxLo, rxLo + (rxFull - rxLo) * rxBlend);
					} catch (_) {
						/* Undlad fallback der capper rx til ~w/2 — det fjerner hele scale-kompensationen. */
					}
				}
			} catch {}
			/* Kort phone landscape = samme bue som desktop (ingen 1.09-ring) */
			const shortLsRing = false;
			const n = nodeArray.length || 1;
			// Start at top (-90deg) and go clockwise.
			const startAngle = -Math.PI / 2;
			const step = (Math.PI * 2) / n;

			// Preserve the existing "sketchy tilt" vibe without affecting positioning.
			const tilts = [-1, 1, -2, 0.5, -1.5, 2, -0.5, 1.5];

			// Anchor each tab by its CENTER so varying text widths/heights don't break the circle.
			nodeArray.forEach((node, i) => {
				const angle = startAngle + i * step;
				/* Kort landscape: skub hele ringen ~8% ud fra centrum — mindre overlap end per-node-fidus */
				const rxEff = shortLsRing ? rx * 1.09 : rx;
				const ryEff = shortLsRing ? ry * 1.09 : ry;
				let x = centerX + rxEff * Math.cos(angle);
				let y = centerY + ryEff * Math.sin(angle);
				const href = (node.getAttribute('href') || '').toLowerCase();
				const shortLs = shortLsRing;

				/* Øvre bue: mindre træk mod midten i kort landscape → mere plads til top/bund */
				if (Math.sin(angle) < -0.12) {
					const topPull = tabletLandscape ? 0 : shortLs ? 16 : isShortLandscape ? 12 : 26;
					y += Math.round(topPull * scale);
				}

				if (Math.sin(angle) > 0.38) {
					const botPull = tabletLandscape ? 0 : shortLs ? 0 : isShortLandscape ? 22 : 38;
					y -= botPull;
				}

				// Move REPOP + its connected assets (circle/arrow/badges) down one ruled line.
				// (Those assets are positioned from the node's on-screen rect, so this shifts all of it.)
				if (href.includes('repop')) y += touchLayout ? 14 : tabletLandscape ? 12 : 35;
				/* Kort mobil-landscape: cirkel + indhold lidt op */
				if (href.includes('repop') && isShortLandscape) y -= 20;
				/* Kort landscape: skub højre-side (Naturli / Durex / Unge) fra hinanden — mindre overlap på tværs af enheder */
				if (isShortLandscape) {
					if (href.includes('naturli')) {
						y -= 10;
						x += 6;
					}
					if (href.includes('durex')) {
						x += 8;
					}
					if (href.includes('unge-mod-uv')) {
						y += 12;
						x += 6;
					}
				}
				/* Desktop (≥1025): venstresidens bobler længere ud — ikke iPad landskab (hold ring cirkulær) */
				try {
					if (!tabletLandscape && !narrow && !isShortLandscape && w >= 1025) {
						const leftPush = Math.round(56 * scale);
						if (
							href.includes('byens-landhandel') ||
							href.includes('brainfarts') ||
							href.includes('kobajer')
						) {
							x -= leftPush;
						}
					}
				} catch {}
				/* Desktop: UNGE MOD UV — ned + mod højre — ikke iPad landskab */
				try {
					if (
						!tabletLandscape &&
						!narrow &&
						!isShortLandscape &&
						w >= 1025 &&
						href.includes('unge-mod-uv')
					) {
						y += Math.round(46 * scale);
						x += Math.round(56 * scale);
					}
				} catch {}
				/* Desktop: TWISTER — lidt ned — ikke iPad landskab */
				try {
					if (!tabletLandscape && !narrow && !isShortLandscape && w >= 1025 && href.includes('twister')) {
						y += Math.round(14 * scale);
					}
				} catch {}

				x = Math.round(x);
				y = Math.round(y);

				if (tabletLandscape) {
					if (href.includes('repop')) {
						x += Math.round(4 * scale);
						y += Math.round(2 * scale);
					}
					if (href.includes('naturli')) {
						x += Math.round(10 * scale);
						y -= Math.round(6 * scale);
					}
					if (href.includes('byens-landhandel') || href.includes('byens')) {
						x -= Math.round(4 * scale);
						y -= Math.round(4 * scale);
					}
					if (href.includes('brainfarts')) {
						x += Math.round(4 * scale);
						y -= Math.round(6 * scale);
					}
					if (href.includes('kobajer')) {
						x -= Math.round(2 * scale);
						y += Math.round(6 * scale);
					}
					if (href.includes('unge-mod-uv')) {
						x += Math.round(6 * scale);
						y -= Math.round(6 * scale);
					}
					const padX = Math.round(22 * scale);
					let bandTopClamp = Math.round(44 * scale);
					try {
						const nb = document.querySelector('.navbar');
						if (nb && nb.getBoundingClientRect) {
							bandTopClamp = Math.max(bandTopClamp, Math.round(nb.getBoundingClientRect().bottom + 14));
						}
					} catch (_) {}
					const bandBottomClamp = layoutH - Math.round(18 * scale);
					if (href.includes('durex')) {
						const durexMaxX = layoutW - Math.round(72 * scale);
						x = Math.max(padX, Math.min(durexMaxX, x));
					} else {
						x = Math.max(padX, Math.min(layoutW - padX, x));
					}
					y = Math.max(bandTopClamp, Math.min(bandBottomClamp, y));
				}

				node.style.setProperty('position', 'absolute', 'important');
				node.style.setProperty('left', `${x}px`, 'important');
				node.style.setProperty('top', `${y}px`, 'important');
				node.style.setProperty('right', 'auto', 'important');
				node.style.setProperty('bottom', 'auto', 'important');
				node.style.setProperty('margin-left', '0', 'important');
				node.style.setProperty('margin-top', '0', 'important');

				// Center + tilt.
				node.style.setProperty(
					'transform',
					`translate(-50%, -50%) rotate(${tilts[i] ?? 0}deg)`,
					'important'
				);

				// Move ONLY the label for BRAINFARTS a bit to the right (do not wipe image titles).
				if (href.includes('brainfarts')) {
					const title = node.querySelector('.project-node__title');
					if (title) {
						title.style.display = 'inline-block';
						title.style.transform = 'translateX(3px)';
					} else {
						let label = node.querySelector('.node-label');
						if (!label) {
							label = document.createElement('span');
							label.className = 'node-label';
							label.textContent = node.textContent;
							node.textContent = '';
							node.appendChild(label);
						}
						label.style.display = 'inline-block';
						label.style.transform = 'translateX(3px)';
					}
				}
			});

			// Keep the D&AD logo aligned after node layout updates
			createAndPositionDandDLogo();
			createAndPositionTwisterDandDLine();
			createAndPositionRepopKravlingLine();
			createAndPositionKravlingNomineretBadge();
			createAndPositionKobajerArrow();
			ensureProjectsMobileInlineBadges();
			hideStandaloneDandDForProjectsMindmapPortrait(container);
			try {
				if (ipadDocEllipse || tabletLandscape) {
					container.classList.add('projects-mindmap--ready');
					container.dataset.mskMindmapLayout = `${layoutW}x${layoutH}`;
				}
			} catch (_) {}
			try {
				ensureBrainfartsInlineSignForTabletLandscape();
			} catch (_) {}
			try {
				mskApplyUngeModUvIpadLandscapeTitleNudge();
			} catch (_) {}
			try {
				mskApplyDurexIpadLandscapeTitleNudge();
			} catch (_) {}
		}

		/** iPad landskab: “Under ombygning” inde i BRAINFARTS-cirklen — ikke den store desktop-pil. */
		function ensureBrainfartsInlineSignForTabletLandscape() {
			try {
				mskApplyBrainfartsIpadLandscapeConstructionSign();
			} catch (_) {}
		}

		/** Mobile CSS hides standalone Kravling/D&AD badges; show copies inside REPOP / KØ-BAJER / TWISTER / BRAINFARTS nodes. */
		function ensureProjectsMobileInlineBadges() {
			try {
				if (!document.body || !document.body.classList.contains('projects-page')) return;
				const container = document.querySelector('.brainstorm-container');
				if (!container) return;
				let narrow = false;
				try {
					narrow = !!(window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
				} catch {}
				const cw = container.getBoundingClientRect().width;
				if (
					!(
						narrow ||
						cw <= 640 ||
						mskIsProjectsShortLandscapeViewport() ||
						mskIsProjectsTabletPortraitViewport() ||
						mskIsProjectsPhonePortraitViewport()
					)
				)
					return;

				function stackNode(el) {
					if (!el) return;
					el.style.setProperty('display', 'flex', 'important');
					el.style.setProperty('flex-direction', 'column', 'important');
					el.style.setProperty('align-items', 'center', 'important');
					el.style.setProperty('justify-content', 'center', 'important');
				}

				const repop = container.querySelector('a[href*="repop"]');
				stackNode(repop);
				if (repop && !repop.querySelector('.kravling-nomineret-badge--inline')) {
					const el = document.createElement('div');
					el.className = 'kravling-nomineret-badge kravling-nomineret-badge--inline';
					el.setAttribute('aria-hidden', 'true');
					el.innerHTML = `
						<div class="kravling-line1">KRAVLINGPRISEN</div>
						<div class="kravling-line2">NOMINERET</div>
						<div class="kravling-line3">2025</div>
					`;
					repop.appendChild(el);
				}

				const kob = container.querySelector('a[href*="kobajer"]');
				stackNode(kob);
				if (kob && !kob.querySelector('.kobajer-kravling-2024-badge--inline')) {
					const el = document.createElement('div');
					el.className = 'kobajer-kravling-2024-badge kobajer-kravling-2024-badge--inline';
					el.setAttribute('aria-hidden', 'true');
					el.innerHTML = `
						<div class="kobajer-kravling-2024-text">
							<div class="kravling-line1">KRAVLINGPRISEN</div>
							<div class="kravling-line2">NOMINERET</div>
							<div class="kravling-line3">2024</div>
						</div>
					`;
					kob.appendChild(el);
				}

				const tw = container.querySelector('a[href*="twister"]');
				stackNode(tw);
				if (tw && !tw.querySelector('.dandd-badge--inline')) {
					const el = document.createElement('div');
					el.className = 'dandd-badge dandd-badge--inline';
					el.setAttribute('aria-hidden', 'true');
					const logo = document.createElement('img');
					logo.className = 'dandd-logo';
					logo.alt = 'D&AD';
					logo.src = 'assets/D&AD LOGO.webp';
					logo.onerror = () => {
						logo.onerror = null;
						logo.src = 'assets/D&AD logo.webp';
					};
					const winner = document.createElement('img');
					winner.className = 'dandd-winner';
					winner.alt = 'D&AD VINDER';
					winner.src = 'assets/D&AD VINDER.webp';
					el.appendChild(logo);
					el.appendChild(winner);
					tw.appendChild(el);
				}

				const bf = container.querySelector('a[href*="brainfarts"]');
				stackNode(bf);
				if (bf && !bf.querySelector('.brainfarts-build__sign--inline')) {
					const img = document.createElement('img');
					img.className = 'brainfarts-build__sign--inline';
					img.alt = '';
					img.draggable = false;
					img.src = `assets/${encodeURIComponent('Under ombygning.webp')}`;
					img.setAttribute('aria-hidden', 'true');
					bf.appendChild(img);
				}
				try {
					mskApplyBrainfartsIpadLandscapeConstructionSign();
				} catch (_) {}
			} catch {}
		}

		// Create fart clouds
		function createFartClouds() {
			if (!fartLayer) return;
			
				const cloud = document.createElement('div');
				cloud.className = 'fart-cloud';

			// Spawn from the brain "butt" area: slightly under/right inside fartLayer
			const size = 18 + Math.random() * 18; // 18-36px (bigger)
			const left = 58 + Math.random() * 14; // %
			const top = 50 + Math.random() * 14;  // % (start higher)

			// Move UP only
			const dy = -(80 + Math.random() * 90);
			const scale = 1.2 + Math.random() * 1.0;
			const dur = 0.9 + Math.random() * 0.8;

			cloud.style.left = `${left}%`;
			cloud.style.top = `${top}%`;
			cloud.style.width = `${size}px`;
			cloud.style.height = `${size}px`;
			cloud.style.setProperty('--dy', `${dy}px`);
			cloud.style.setProperty('--scale', String(scale));
			cloud.style.setProperty('--dur', `${dur}s`);

			// Slight color variety
			if (Math.random() < 0.33) cloud.classList.add('light');
			if (Math.random() < 0.33) cloud.classList.add('dark');

				fartLayer.appendChild(cloud);
			window.setTimeout(() => cloud.remove(), (dur * 1000) + 250);
		}

		// Brain blush (cheeks) - small red dot patches on the brain itself
		function createBrainBlush() {
			if (!brain) return;
			// Avoid duplicates
			if (brain.querySelector('.brain-blush')) return;

			const left = document.createElement('div');
			left.className = 'brain-blush left';
			const right = document.createElement('div');
			right.className = 'brain-blush right';

			brain.appendChild(left);
			brain.appendChild(right);
		}

		// Place D&AD logo to the right of TWISTER tab (projects page)
		function createAndPositionDandDLogo() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			if (container.classList.contains('projects-mindmap--portrait') || mskIsProjectsPortraitGridDocumentMode()) return;
			const twisterNode = Array.from(nodes).find(n => (n.getAttribute('href') || '').toLowerCase().includes('twister'));
			if (!twisterNode) return;

			function fillShineRays(sparksEl, count = 14) {
				// Replace with many rays (more intense shine)
				sparksEl.innerHTML = '';
				// Full 360° ring of rays around the set
				const start = -180;
				const step = 360 / Math.max(1, count); // avoid duplicating -180/180
				for (let i = 0; i < count; i++) {
					const s = document.createElement('span');
					s.className = 'spark';
					const rot = start + (step * i);
					const delay = (i % 10) * 0.06;
					const w = (i % 3 === 0) ? 4 : 3;
					// Perfect round ring: ALL rays start from the same radius.
					const r = 40;
					let h = 54;
					// Every second ray is half as long (but starts at the same ring)
					if (i % 2 === 1) h = Math.round(h * 0.5);
					s.style.setProperty('--rot', `${rot}deg`);
					s.style.setProperty('--d', `${delay}s`);
					s.style.setProperty('--w', `${w}px`);
					s.style.setProperty('--r', `${r}px`);
					s.style.setProperty('--h', `${h}px`);
					sparksEl.appendChild(s);
				}
			}

			let badge = container.querySelector('.dandd-badge:not(.dandd-badge--inline)');
			if (!badge) {
				badge = document.createElement('div');
				badge.className = 'dandd-badge';

				const logo = document.createElement('img');
				logo.className = 'dandd-logo';
				logo.alt = "D&AD";
				// Always ensure we use the newest logo file (fallback to the alternative filename if needed)
				logo.src = "assets/D&AD LOGO.webp";
				logo.onerror = () => {
					logo.onerror = null;
					logo.src = "assets/D&AD logo.webp";
				};

				const winner = document.createElement('img');
				winner.className = 'dandd-winner';
				winner.alt = 'D&AD VINDER';
				winner.src = 'assets/D&AD VINDER.webp';

				const sparks = document.createElement('div');
				sparks.className = 'dandd-sparks';
				fillShineRays(sparks, 14);

				badge.appendChild(logo);
				badge.appendChild(sparks);
				badge.appendChild(winner);
				container.appendChild(badge);
			} else {
				// Keep logo source up to date if assets were swapped
				const logo = badge.querySelector('.dandd-logo');
				if (logo) {
					logo.src = "assets/D&AD LOGO.webp";
					logo.onerror = () => {
						logo.onerror = null;
						logo.src = "assets/D&AD logo.webp";
					};
				}
				// Ensure sparks layer exists
				let sparks = badge.querySelector('.dandd-sparks');
				if (!sparks) {
					sparks = document.createElement('div');
					sparks.className = 'dandd-sparks';
					const logoEl = badge.querySelector('.dandd-logo');
					if (logoEl && logoEl.nextSibling) badge.insertBefore(sparks, logoEl.nextSibling);
					else badge.appendChild(sparks);
				}
				// Always rebuild to match "more rays"
				fillShineRays(sparks, 14);
				// Replace old text (if present) with the winner asset
				badge.querySelectorAll('.dandd-text').forEach(el => el.remove());
				let winner = badge.querySelector('.dandd-winner');
				if (!winner) {
					winner = document.createElement('img');
					winner.className = 'dandd-winner';
					winner.alt = 'D&AD VINDER';
					badge.appendChild(winner);
				}
				winner.src = 'assets/D&AD VINDER.webp';
			}

			const containerRect = container.getBoundingClientRect();
			const r = twisterNode.getBoundingClientRect();
			const top = (r.top - containerRect.top) + (r.height / 2) + 46; // D&AD badge: lidt længere ned under TWISTER
			const left = (r.right - containerRect.left) + 14 + 70; // move a lot more right

			badge.style.left = `${left}px`;
			badge.style.top = `${top}px`;
			badge.style.transform = 'translateY(-50%) rotate(-2deg)';
		}

		// Charcoal rays (like TWISTER rays, but dark pencil/charcoal vibe)
		function fillCharcoalRays(sparksEl, count = 14, opts = {}) {
			if (!sparksEl) return;
			sparksEl.innerHTML = '';
			const ringR = Number.isFinite(opts.r) ? opts.r : 48;
			const baseH = Number.isFinite(opts.h) ? opts.h : 72;
			const start = -180;
			const step = 360 / Math.max(1, count);
			for (let i = 0; i < count; i++) {
				const s = document.createElement('span');
				s.className = 'spark';
				const rot = start + (step * i);
				const delay = (i % 10) * 0.06;
				const w = (i % 3 === 0) ? 4 : 3;
				const r = ringR;
				let h = baseH;
				if (i % 2 === 1) h = Math.round(h * 0.5);
				s.style.setProperty('--rot', `${rot}deg`);
				s.style.setProperty('--d', `${delay}s`);
				s.style.setProperty('--w', `${w}px`);
				s.style.setProperty('--r', `${r}px`);
				s.style.setProperty('--h', `${h}px`);
				sparksEl.appendChild(s);
			}
		}

		// Place the line asset between TWISTER and the D&AD badge (more reliable than SVG <image>)
		function createAndPositionTwisterDandDLine() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			if (container.classList.contains('projects-mindmap--portrait') || mskIsProjectsPortraitGridDocumentMode()) return;
			const twisterNode = Array.from(nodes).find(n => (n.getAttribute('href') || '').toLowerCase().includes('twister'));
			const badge = container.querySelector('.dandd-badge:not(.dandd-badge--inline)');
			if (!twisterNode || !badge) return;

			let line = container.querySelector('.twister-dandd-line');
			if (!line) {
				line = document.createElement('img');
				line.className = 'twister-dandd-line';
				line.alt = '';
				line.src = encodeURI("assets/linje mellem  twister og  D&AD.webp");
				container.appendChild(line);
			}
			applyMindmapLineImgBaseStyles(line);

			const containerRect = container.getBoundingClientRect();
			const twRect = twisterNode.getBoundingClientRect();
			const badgeRect = badge.getBoundingClientRect();

			// Start at TWISTER right-middle, end at badge left-middle
			const startX = (twRect.right - containerRect.left);
			const startY = (twRect.top - containerRect.top) + (twRect.height / 2);
			const endX = (badgeRect.left - containerRect.left);
			const endY = (badgeRect.top - containerRect.top) + (badgeRect.height / 2);

			const dx = endX - startX;
			const dy = endY - startY;
			const dist = Math.sqrt(dx * dx + dy * dy) || 1;

			// Make it longer: extend slightly into both ends
			const gapStart = -28;
			const gapEnd = -28;
			const sX = startX + (dx / dist) * gapStart;
			const sY = startY + (dy / dist) * gapStart;
			const eX = endX - (dx / dist) * gapEnd;
			const eY = endY - (dy / dist) * gapEnd;

			const angle = (Math.atan2(eY - sY, eX - sX) * 180 / Math.PI) + 6; // rotate a bit more down
			const lineLength = Math.sqrt((eX - sX) ** 2 + (eY - sY) ** 2);

			let lineHeightPx = 115;
			if (mskIsProjectsTabletLandscapeViewport()) {
				lineHeightPx = 172;
			}

			line.style.left = `${sX}px`;
			line.style.top = `${sY}px`;
			line.style.width = `${lineLength}px`;
			line.style.height = `${lineHeightPx}px`;
			line.style.transformOrigin = '0 50%';
			line.style.transform = `translateY(-50%) rotate(${angle}deg)`;
		}

		// Place mirrored line asset on the LEFT side of REPOP BY DEPOP
		function createAndPositionRepopKravlingLine() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			if (container.classList.contains('projects-mindmap--portrait') || mskIsProjectsPortraitGridDocumentMode()) return;
			const repopNode = Array.from(nodes).find(n => (n.getAttribute('href') || '').toLowerCase().includes('repop'));
			if (!repopNode) return;

			let line = container.querySelector('.repop-kravling-line');
			if (!line) {
				line = document.createElement('img');
				line.className = 'repop-kravling-line';
				line.alt = '';
				line.src = `assets/${encodeURIComponent("linje fra repop til kravling.webp")}`;
				container.appendChild(line);
			}
			applyMindmapLineImgBaseStyles(line);

			const containerRect = container.getBoundingClientRect();
			const r = repopNode.getBoundingClientRect();
			const titleImg = repopNode.querySelector('.project-node__title-img--repop');
			const titleRect = titleImg ? titleImg.getBoundingClientRect() : r;
			/* Pilens højre kant skal møde venstre kant af REPOP-teksten (ikke hele fanen) */
			let anchorLeft = titleRect.left - containerRect.left;

			// Size (can be tuned) — kortere pil så Kravling + pil ikke sidder “udenfor” cirklen
			const width = 138;
			const height = 80; // slimmer
			const tipOverlapPx = 4;
			/* Skub pil + Kravling-badge mod højre (badge følger via pilens rect) */
			let shiftRightPx = 76;
			try {
				if (mskIsProjectsTabletLandscapeViewport()) {
					anchorLeft += Math.round(titleRect.width * 0.06);
					shiftRightPx = 10;
				}
			} catch (_) {}
			const left = anchorLeft - width + tipOverlapPx + shiftRightPx;

			let arrowTopOffset = 12;
			try {
				if (mskIsProjectsTabletLandscapeViewport()) arrowTopOffset = -4;
			} catch (_) {}
			const top = (r.top - containerRect.top) + (r.height / 2) + arrowTopOffset;

			line.style.width = `${width}px`;
			line.style.height = `${height}px`;
			line.style.left = `${left}px`;
			line.style.top = `${top}px`;
			// Mirror it horizontally
			line.style.transformOrigin = '50% 50%';
			line.style.transform = 'translateY(-50%) scaleX(-1)';
		}

		// Kravlinprisen "stars" (small burst animation)
		function fillKravlingStars(sparksEl, count = 12) {
			if (!sparksEl) return;
			sparksEl.innerHTML = '';
			for (let i = 0; i < count; i++) {
				const star = document.createElement('img');
				star.className = 'kravling-star';
				star.alt = '';
				star.draggable = false;
				star.src = `assets/${encodeURIComponent("stjerne til animation.webp")}`;

				// Elliptical ring (wider horizontally)
				const theta = (i * (Math.PI * 2)) / count;
				const delay = (i * 0.06).toFixed(2);
				// Different rotations per star (deterministic jitter so it stays stable)
				const baseRot = (i * (360 / count)) + ((i % 2 === 0) ? 12 : -10);
				const jitter = (((i * 37) % 50) - 25); // -25..+24 deg
				const rot = baseRot + jitter;

				const rxBase = 88; // horizontal radius (wider)
				const ryBase = 42; // vertical radius (slightly bigger top+bottom)
				const radiusMult = (i % 2 === 0) ? 1 : 0.86; // alternate distance

				const x = Math.cos(theta) * rxBase * radiusMult;
				let y = Math.sin(theta) * ryBase * radiusMult;
				// Make the ellipse slightly bigger in the bottom half (extend downward only)
				if (y > 0) y *= 1.22;

				// Bigger stars (slightly bigger overall, and a touch bigger in the bottom half)
				let size = (i % 3 === 0) ? 28 : (i % 3 === 1) ? 26 : 27;
				if (y > 0) size += 2; // bottom half (downwards) a bit bigger

				// Half of them should be 2/3 size (every second star)
				if (i % 2 === 1) size = Math.round(size * (2 / 3));

				star.style.left = `calc(50% + ${x.toFixed(1)}px)`;
				star.style.top = `calc(50% + ${y.toFixed(1)}px)`;
				star.style.setProperty('--rot', `${rot}deg`);
				star.style.setProperty('--d', `${delay}s`);
				star.style.setProperty('--s', `${size}px`);

				sparksEl.appendChild(star);
			}
		}

		// Place "Kravlinprisen nomineret 2025" badge to the LEFT of the repop-arrow
		function createAndPositionKravlingNomineretBadge() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			if (container.classList.contains('projects-mindmap--portrait') || mskIsProjectsPortraitGridDocumentMode()) return;
			const arrow = container.querySelector('.repop-kravling-line');
			if (!arrow) return;

			let badge = container.querySelector('.kravling-nomineret-badge');
			// If an old IMG exists, replace it with a text badge
			if (badge && badge.tagName && badge.tagName.toLowerCase() === 'img') {
				badge.remove();
				badge = null;
			}
			if (!badge) {
				badge = document.createElement('div');
				badge.className = 'kravling-nomineret-badge';
				badge.innerHTML = `
					<div class="kravling-line1">KRAVLINGPRISEN</div>
					<div class="kravling-line2">NOMINERET</div>
					<div class="kravling-line3">2025</div>
				`;
				container.appendChild(badge);
			}

			// Ensure stars layer exists (for hover over REPOP)
			let sparks = badge.querySelector('.kravling-sparks');
			if (!sparks) {
				sparks = document.createElement('div');
				sparks.className = 'kravling-sparks';
				badge.appendChild(sparks);
			}
			fillKravlingStars(sparks, 12);

			const containerRect = container.getBoundingClientRect();
			const a = arrow.getBoundingClientRect();

			const width = 160;
			const gap = 4;
			const left = (a.left - containerRect.left) - width - gap;
			const top = (a.top - containerRect.top) + (a.height / 2);

			badge.style.width = `${width}px`;
			badge.style.height = 'auto';
			badge.style.left = `${left}px`;
			badge.style.top = `${top}px`;
			badge.style.transform = 'translateY(-50%) translateX(22px) translateY(-12px) rotate(-2deg)'; /* tættere på pil + tekst */
		}

		// Place arrow asset just under KØ-BAJER
		function createAndPositionKobajerArrow() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			if (container.classList.contains('projects-mindmap--portrait') || mskIsProjectsPortraitGridDocumentMode()) return;

			const kobajerNode = Array.from(nodes).find(n => {
				const href = (n.getAttribute('href') || '').toLowerCase();
				const text = (n.textContent || '').trim().toUpperCase();
				return href.includes('kobajer') || text.includes('KØ-BAJER');
			});
			if (!kobajerNode) return;

			let arrow = container.querySelector('.kobajer-arrow');
			if (!arrow) {
				arrow = document.createElement('img');
				arrow.className = 'kobajer-arrow';
				arrow.alt = '';
				arrow.draggable = false;
				container.appendChild(arrow);
			}
			applyKobajerArrowBaseStyles(arrow);
			// Always use the latest arrow asset file
			arrow.src = `assets/${encodeURIComponent('pil til kø bajer.webp')}`;
			// When navigating/re-initializing, the arrow image may not have dimensions yet.
			// Re-position the 2024 badge once the arrow has loaded.
			if (arrow.dataset.kobajerArrowBound !== '1') {
				arrow.dataset.kobajerArrowBound = '1';
				arrow.addEventListener('load', () => {
					// Reset retry counter and re-place the label once dimensions are known
					arrow.dataset.kravling2024Tries = '0';
					createAndPositionKobajerKravling2024Label();
				});
			}

			const containerRect = container.getBoundingClientRect();
			const r = kobajerNode.getBoundingClientRect();

			let width = 66;
			let arrowScaleY = 1.4;
			let arrowScaleX = 1;
			try {
				if (mskIsProjectsTabletLandscapeViewport()) {
					width = 72;
					arrowScaleY = 1.48;
					arrowScaleX = 1.06;
				}
			} catch (_) {}
			const gap = -35; // move slightly down
			const left = (r.left - containerRect.left) + (r.width / 2) - (width / 2) - 42; // more to the right
			const top = (r.bottom - containerRect.top) + gap;

			arrow.style.setProperty('width', `${width}px`, 'important');
			arrow.style.setProperty('height', 'auto', 'important');
			arrow.style.setProperty('max-width', 'none', 'important');
			arrow.style.setProperty('max-height', 'none', 'important');
			arrow.style.setProperty('object-fit', 'contain', 'important');
			arrow.style.left = `${left}px`;
			arrow.style.top = `${top}px`;
			// Point down, and make it thicker without making it longer
			arrow.style.transformOrigin = '50% 50%';
			arrow.style.transform = `rotate(115deg) scale(${arrowScaleX}, ${arrowScaleY})`;

			// Position the "Kravlingprisen nomineret 2024" label under the arrow tip
			createAndPositionKobajerKravling2024Label();

			// If the image is cached, 'load' may not fire after we attach listeners.
			// Ensure we attempt a position pass once the browser has a chance to compute layout.
			window.setTimeout(createAndPositionKobajerKravling2024Label, 0);
		}

		// Repeat "Kravlingprisen nomineret" with 2024 under the arrow point
		function createAndPositionKobajerKravling2024Label() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			const arrow = container.querySelector('.kobajer-arrow');

			let badge = container.querySelector('.kobajer-kravling-2024-badge');
			if (!badge) {
				badge = document.createElement('div');
				badge.className = 'kobajer-kravling-2024-badge';
				badge.innerHTML = `
					<div class="kobajer-kravling-2024-text">
						<div class="kravling-line1">KRAVLINGPRISEN</div>
						<div class="kravling-line2">NOMINERET</div>
						<div class="kravling-line3">2024</div>
					</div>
				`;
				container.appendChild(badge);
			}

			// Always keep it in the DOM (never "disappear"), even if we still need to re-position.
			badge.style.display = 'block';

			// If the arrow element isn't present yet, keep the badge visible in a safe fallback spot,
			// and retry shortly until the arrow exists.
			if (!arrow) {
				// Keep last known good coordinates if we have them
				if (badge.dataset.lastLeft && badge.dataset.lastTop) {
					badge.style.left = badge.dataset.lastLeft;
					badge.style.top = badge.dataset.lastTop;
					badge.style.transform = badge.dataset.lastTransform || 'translateX(-50%) rotate(-2deg)';
				} else {
					// Fallback: place roughly under the KØ-BAJER node so it's visible immediately.
					const kobajerNode = Array.from(document.querySelectorAll('.project-node')).find(n => {
						const href = (n.getAttribute('href') || '').toLowerCase();
						const text = (n.textContent || '').trim().toUpperCase();
						return href.includes('kobajer') || text.includes('KØ-BAJER');
					});
					if (kobajerNode) {
						const containerRect = container.getBoundingClientRect();
						const nr = kobajerNode.getBoundingClientRect();
						const x = (nr.left - containerRect.left) + (nr.width / 2);
						const y = (nr.bottom - containerRect.top);
						badge.style.left = `${x - 18}px`;
						badge.style.top = `${y - 20}px`;
						badge.style.transform = 'translateX(-50%) rotate(-2deg)';
					}
				}

				const tries = Number(badge.dataset.kravling2024Tries || '0');
				if (tries < 20) {
					badge.dataset.kravling2024Tries = String(tries + 1);
					window.setTimeout(createAndPositionKobajerKravling2024Label, 140);
				}
				return;
			}

			// If the arrow hasn't loaded yet, its rect can be 0 and the badge would be positioned wrong.
			// In that case: keep the badge, but retry positioning shortly.
			const arrowRectNow = arrow.getBoundingClientRect();
			if (!arrowRectNow.width || !arrowRectNow.height) {
				// Keep last good position while waiting
				if (badge.dataset.lastLeft && badge.dataset.lastTop) {
					badge.style.left = badge.dataset.lastLeft;
					badge.style.top = badge.dataset.lastTop;
					badge.style.transform = badge.dataset.lastTransform || 'translateX(-50%) rotate(-2deg)';
				}
				const tries = Number(arrow.dataset.kravling2024Tries || '0');
				if (tries < 16) {
					arrow.dataset.kravling2024Tries = String(tries + 1);
					window.setTimeout(createAndPositionKobajerKravling2024Label, 120);
				}
				return;
			}
			// If an older badge exists without the wrapper, wrap the lines so we can size rays to text.
			let textWrap = badge.querySelector('.kobajer-kravling-2024-text');
			if (!textWrap) {
				textWrap = document.createElement('div');
				textWrap.className = 'kobajer-kravling-2024-text';
				const lines = Array.from(badge.querySelectorAll('.kravling-line1, .kravling-line2, .kravling-line3'));
				lines.forEach(l => textWrap.appendChild(l));
				badge.insertBefore(textWrap, badge.firstChild);
			}

			// Ensure charcoal ray layer exists (for hover over KØ-BAJER)
			let sparks = badge.querySelector('.kobajer-kravling-2024-sparks');
			if (!sparks) {
				sparks = document.createElement('div');
				sparks.className = 'kobajer-kravling-2024-sparks';
				badge.appendChild(sparks);
			}

			const containerRect = container.getBoundingClientRect();
			const r = arrow.getBoundingClientRect();

			// Arrow tip ≈ bottom-center of its visual bounding box
			const tipX = (r.left - containerRect.left) + (r.width / 2);
			const tipY = (r.bottom - containerRect.top);

			badge.style.left = `${tipX - 28}px`; // a bit more to the left
			badge.style.top = `${tipY - 22}px`; // lidt ned ift. pilspids
			badge.style.transform = 'translateX(-50%) rotate(-2deg)';
			badge.dataset.lastLeft = badge.style.left;
			badge.dataset.lastTop = badge.style.top;
			badge.dataset.lastTransform = badge.style.transform;

			// Size/center the animation *around the text* (not the whole badge).
			// This makes the ring hug the 3-line text block.
			const badgeRect = badge.getBoundingClientRect();
			const textRect = textWrap.getBoundingClientRect();
			const textCenterX = (textRect.left - badgeRect.left) + (textRect.width / 2);
			const textCenterY = (textRect.top - badgeRect.top) + (textRect.height / 2);

			// Padding around the text (tune feel here)
			const padX = 64; // base horizontal padding (ring is stretched via scaleX below)
			const padY = 40; // slightly bigger at the top (we bias upward below)
			const ringW = Math.max(120, textRect.width + padX);
			const ringH = Math.max(90, textRect.height + padY);

			sparks.style.left = `${textCenterX - 6}px`;
			// Bias slightly upward, but leave a tiny bit more bottom
			sparks.style.top = `${textCenterY - 7}px`;
			sparks.style.width = `${ringW}px`;
			sparks.style.height = `${ringH}px`;
			// Make the ring more horizontally long (ellipse)
			const scaleX = 1.65;
			const scaleY = 0.90;
			sparks.style.transform = `translate(-50%, -50%) scaleX(${scaleX}) scaleY(${scaleY})`;

			// Rebuild rays with radius based on the text ring size
			// Use height as the basis so scaleX turns it into an ellipse (wider without getting taller).
			const ringR = Math.max(26, (ringH / 2) - 10);
			const rayH = Math.max(46, Math.round(ringR * 1.25));
			fillCharcoalRays(sparks, 14, { r: ringR, h: rayH });
		}

		// Brainfarts hover: start/stop farting
		let isFarting = false;
		let fartResetTimeoutId = null;
		function startBrainFart() {
			if (!fartLayer) return;
			if (isFarting) return; // one single animation per hover
			isFarting = true;
			if (brain) brain.classList.add('is-farting');

			// Single burst (one animation): spawn a few puffs once
			for (let i = 0; i < 4; i++) createFartClouds();

			// Allow a new burst after the animation is done
			if (fartResetTimeoutId) window.clearTimeout(fartResetTimeoutId);
			fartResetTimeoutId = window.setTimeout(() => {
				isFarting = false;
				if (brain) brain.classList.remove('is-farting');
				fartResetTimeoutId = null;
			}, 1600);
		}
		function stopBrainFart() {
			isFarting = false;
			if (fartResetTimeoutId) {
				window.clearTimeout(fartResetTimeoutId);
				fartResetTimeoutId = null;
			}
			if (brain) brain.classList.remove('is-farting');
			// Clear remaining puffs quickly
			if (fartLayer) fartLayer.querySelectorAll('.fart-cloud').forEach(el => el.remove());
		}

		// Create asset elements
		function createAssets() {
			console.log('Creating assets...');
			
			// Condom asset for Durex
			const condomAsset = document.createElement('img');
			condomAsset.src = 'assets/kondom asset.webp';
			condomAsset.className = 'condom-asset';
			condomAsset.style.cssText = `
				position: absolute;
				width: 135px;
				height: auto;
				top: -22%;
				left: 42%;
				opacity: 0;
				display: none;
				z-index: 10;
				transform: rotate(20deg);
			`;
			brain.appendChild(condomAsset);
			console.log('Condom asset created');

			// Korn asset for Byens Landhandel
			const kornAsset = document.createElement('img');
			kornAsset.src = 'assets/korn asset.webp';
			kornAsset.className = 'korn-asset';
			/* Placering + centrum: styles.css (.brain .korn-asset) — translate(-50%,-50%) + nudge så korn roterer om hjernen */
			kornAsset.style.cssText = `
				position: absolute;
				opacity: 0;
				display: none;
				z-index: 11;
			`;
			brain.appendChild(kornAsset);

			// Kasket asset for Repop
			const kasketAsset = document.createElement('img');
			kasketAsset.src = 'assets/Kasket asset.webp';
			kasketAsset.className = 'kasket-asset';
			kasketAsset.style.cssText = `
				position: absolute;
				width: 180px;
				height: 140px;
				top: 10%;
				left: 50%;
				transform: translate(-50%, -50%);
				opacity: 0;
				display: none;
				z-index: 10;
				object-fit: fill;
			`;
			brain.appendChild(kasketAsset);

			// Øldåse asset for Købajer
			const oldaseAsset = document.createElement('img');
			oldaseAsset.src = 'assets/øldåse asset.webp';
			oldaseAsset.className = 'oldase-asset';
			oldaseAsset.style.cssText = `
				position: absolute;
				width: 110px;
				height: auto;
				top: 55%;
				left: -35%;
				opacity: 0;
				display: none;
				z-index: 10;
			`;
			brain.appendChild(oldaseAsset);

			// Naturli' asset
			const naturliAsset = document.createElement('img');
			naturliAsset.src = 'assets/Naturli\' asset.webp';
			naturliAsset.className = 'naturli-asset';
			naturliAsset.style.cssText = `
				position: absolute;
				width: 115px;
				height: auto;
				top: -32%;
				right: -42%;
				opacity: 0;
				display: none;
				z-index: 10;
			`;
			brain.appendChild(naturliAsset);

			// Naturli' drops asset
			const dropsAsset = document.createElement('img');
			dropsAsset.src = 'asset drops naturlig.png';
			dropsAsset.className = 'naturli-drops-asset';
			dropsAsset.style.cssText = `
				position: absolute;
				width: 56px;
				height: auto;
				top: -38%;
				right: -27%;
				opacity: 0;
				display: none;
				z-index: 10;
			`;
			brain.appendChild(dropsAsset);

			// Twister asset
			const twisterAsset = document.createElement('img');
			twisterAsset.src = 'assets/Twister asset.webp';
			twisterAsset.className = 'twister-asset';
			twisterAsset.style.cssText = `
				position: absolute;
				width: 51px;
				height: auto;
				top: 62%;
				right: 27%;
				opacity: 0;
				display: none;
				z-index: 25;
			`;
			brain.appendChild(twisterAsset);

			// Unge mod UV asset
			const ungeModUvAsset = document.createElement('img');
			ungeModUvAsset.src = 'assets/Unge mod UV asset.webp';
			ungeModUvAsset.className = 'unge-mod-uv-asset';
			ungeModUvAsset.style.cssText = `
				position: absolute;
				width: 160px;
				height: auto;
				top: 55%;
				left: 78%;
				opacity: 0;
				display: none;
				z-index: 10;
			`;
			brain.appendChild(ungeModUvAsset);
		}

		// TWISTER hover: tongue "lick" animation (over -> under the icecream)
		let twisterTongueRafId = null;
		let twisterTonguePhase = 'over'; // 'over' | 'under' | 'pause'
		let twisterTonguePhaseStart = 0;
		let twisterTongueFirstRun = true;

		function createTwisterTongues() {
			if (!brain) return;
			const src = `assets/${encodeURIComponent('tunge til hjerne.webp')}`;

			// If already exists, just update src (so swapping assets works without reload)
			const existing = brain.querySelectorAll('.brain-tongue');
			if (existing && existing.length) {
				existing.forEach((el) => {
					if (el && el.tagName && el.tagName.toLowerCase() === 'img') el.src = src;
				});
				return;
			}

			const under = document.createElement('img');
			under.className = 'brain-tongue tongue-under';
			under.alt = '';
			under.draggable = false;
			under.src = src;
			under.setAttribute('aria-hidden', 'true');

			const over = document.createElement('img');
			over.className = 'brain-tongue tongue-over';
			over.alt = '';
			over.draggable = false;
			over.src = src;
			over.setAttribute('aria-hidden', 'true');

			// Under first, then over, so stacking is consistent
			brain.appendChild(under);
			brain.appendChild(over);
		}

		function startTwisterTongue() {
			if (!brain) return;
			createTwisterTongues();

			const over = brain.querySelector('.brain-tongue.tongue-over');
			const under = brain.querySelector('.brain-tongue.tongue-under');
			if (!over || !under) return;

			// Cancel any running loop
			if (twisterTongueRafId) cancelAnimationFrame(twisterTongueRafId);
			twisterTongueRafId = null;

			// Show both (we'll animate one at a time)
			over.classList.add('is-visible');
			under.classList.add('is-visible');

			// Helpers
			function easeInOut(t) {
				// stronger ease-in-out (cubic)
				t = Math.max(0, Math.min(1, t));
				return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
			}

			const brainSvg = brain.querySelector('svg');
			const mouthPath = brain.querySelector('.brain-mouth');
			if (!brainSvg || !mouthPath) return;

			// reset state
			twisterTonguePhase = 'pause'; // start with a tiny delay before first lick
			twisterTonguePhaseStart = performance.now();
			twisterTongueFirstRun = true;

			const overDur = 1180;
			const underDur = 1180;
			const pauseDur = 680;
			const initialDelay = 180; // start a little later on hover

			const tick = (now) => {
				if (!brain || brain.dataset.twisterTongueActive !== '1') {
					twisterTongueRafId = null;
					return;
				}

				const svgRect = brainSvg.getBoundingClientRect();
				const brainRect = brain.getBoundingClientRect();

				// Build/refresh a hidden "track" path that matches the mouth exactly.
				let track = brainSvg.querySelector('.tongue-track');
				if (!track) {
					track = document.createElementNS('http://www.w3.org/2000/svg', 'path');
					track.classList.add('tongue-track');
					track.setAttribute('fill', 'none');
					track.setAttribute('stroke', 'none');
					brainSvg.appendChild(track);
				}
				const d = mouthPath.getAttribute('d') || '';
				track.setAttribute('d', d);

				let totalLen = 0;
				try {
					totalLen = track.getTotalLength();
				} catch {
					twisterTongueRafId = requestAnimationFrame(tick);
					return;
				}
				if (!Number.isFinite(totalLen) || totalLen <= 0) {
					twisterTongueRafId = requestAnimationFrame(tick);
					return;
				}

				const elapsed = now - twisterTonguePhaseStart;
				let activeEl = null;
				let t = 0;
				let baseUnder = 0;

				if (twisterTonguePhase === 'over') {
					activeEl = over;
					t = Math.min(1, elapsed / overDur);
					baseUnder = -7; // will be shaped by progress below
					if (t >= 1) { twisterTonguePhase = 'under'; twisterTonguePhaseStart = now; }
				} else if (twisterTonguePhase === 'under') {
					activeEl = under;
					t = Math.min(1, elapsed / underDur);
					baseUnder = -7; // will be shaped by progress below
					if (t >= 1) { twisterTonguePhase = 'pause'; twisterTonguePhaseStart = now; }
				} else {
					// pause
					activeEl = null;
					const curPause = twisterTongueFirstRun ? initialDelay : pauseDur;
					if (elapsed >= curPause) {
						twisterTonguePhase = 'over';
						twisterTonguePhaseStart = now;
						twisterTongueFirstRun = false;
					}
				}

				// Hide the non-active tongue while keeping it ready
				if (activeEl !== over) over.style.opacity = '0';
				if (activeEl !== under) under.style.opacity = '0';

				if (activeEl) {
					// Start a little later and end a tiny sooner within each pass
					const lead = 0.08; // 8% delay before showing/moving
					const tail = 0.06; // 6% cut at the end
					const tEff = Math.max(0, Math.min(1, (t - lead) / Math.max(0.001, (1 - lead - tail))));
					const tt = easeInOut(tEff);
					// Make the tongue sit slightly LOWER on the right side of the mouth.
					// Left start should stay where it is; right end was too high.
					// Over (L->R): -7 at left -> +11 at right, PLUS extra "down" only at the far right tip
					// Under (R->L): mirror that (extra "down" only at the start when it's at the far right)
					const tipBoost = 4 * Math.pow(tt, 4); // mostly affects the last ~20% near the right end
					const leftLift = -2 * Math.pow(1 - tt, 4); // slightly UP at the far left start
					// At the far right tip, lift it a touch (it was still a bit too low there)
					const rightLift = -1.6 * Math.pow(tt, 4);
					if (activeEl === over) baseUnder = -7 + (18 * tt) + tipBoost + leftLift + rightLift;
					else baseUnder = 11 - (18 * tt) + (4 * Math.pow(1 - tt, 4)) + (-2 * Math.pow(tt, 4)) + (-1.6 * Math.pow(1 - tt, 4));

					// Over: left->right, Under: right->left along the *actual path length*
					// Don't go as far left/right as before
					const startLen = totalLen * 0.12;
					const endLen = totalLen * 0.86;
					const len = (activeEl === over)
						? (startLen + (endLen - startLen) * tt)
						: (endLen - (endLen - startLen) * tt);

					const pt = track.getPointAtLength(len);
					const pt2 = track.getPointAtLength(Math.min(totalLen, len + 1));
					const dx = (pt2.x - pt.x) || 0.0001;
					const dy = (pt2.y - pt.y) || 0.0001;
					// angle of tangent
					const ang = Math.atan2(dy, dx);

					// normal (perpendicular) pointing downward (positive y)
					let nx = -dy;
					let ny = dx;
					const nLen = Math.hypot(nx, ny) || 1;
					nx /= nLen;
					ny /= nLen;
					// ensure it points downward
					if (ny < 0) { nx *= -1; ny *= -1; }

					// map SVG viewBox coords (0..100) into pixels
					const xPx = (pt.x / 100) * svgRect.width;
					const yPx = (pt.y / 100) * svgRect.height;

					// svg isn't guaranteed to start at (0,0) inside .brain (borders/positioning),
					// so convert SVG pixel coords -> .brain-local coords
					const xInBrain = xPx + (svgRect.left - brainRect.left);
					const yInBrain = yPx + (svgRect.top - brainRect.top);

					// offset just under the mouth line, following the curve
					const offX = nx * baseUnder;
					const offY = ny * baseUnder;

					activeEl.style.left = `${xInBrain + offX}px`;
					activeEl.style.top = `${yInBrain + offY}px`;

					// Rotate slightly with the mouth slope
					const rotDeg = (ang * 180 / Math.PI);

					// Start should use a fade-in only (no fade-out, no blur)
					const fadeIn = 0.12;
					const fadeOut = 0.12;
					let alpha = 1;
					if (t < lead) alpha = 0;
					else if (t > (1 - tail)) alpha = 0;
					else if (tEff < fadeIn) alpha = easeInOut(tEff / fadeIn);
					else if (tEff > (1 - fadeOut)) alpha = easeInOut((1 - tEff) / fadeOut);
					activeEl.style.opacity = String(alpha);
					activeEl.style.filter = `var(--tongueBaseFilter)`;

					// Anchor higher so the tongue sits up into the mouth line
					activeEl.style.transform = `translate(-50%, -40%) rotate(${rotDeg}deg) scale(1)`;
				}

				twisterTongueRafId = requestAnimationFrame(tick);
			};

			twisterTongueRafId = requestAnimationFrame(tick);
		}

		function stopTwisterTongue() {
			if (!brain) return;
			brain.dataset.twisterTongueActive = '0';
			if (twisterTongueRafId) cancelAnimationFrame(twisterTongueRafId);
			twisterTongueRafId = null;
			const over = brain.querySelector('.brain-tongue.tongue-over');
			const under = brain.querySelector('.brain-tongue.tongue-under');
			if (over) { over.classList.remove('is-visible'); over.style.opacity = ''; over.style.transform = ''; over.style.filter = ''; }
			if (under) { under.classList.remove('is-visible'); under.style.opacity = ''; under.style.transform = ''; under.style.filter = ''; }
		}

	/** iPad landskab: lodret Repop-streg — længere op i ring + længere ned mod hjernen. */
	function mskRepopIpadLandscapeLinePoints(containerRect, brainRect, ring, node, nodeRect) {
		const brainRadiusLine = Math.min(brainRect.width, brainRect.height) / 2;
		const centerX = brainRect.left - containerRect.left + brainRect.width / 2;
		const brainTop = brainRect.top - containerRect.top;
		const lineDownPx = Math.round(brainRadiusLine * 0.11);
		const brainStartY = brainTop + Math.round(brainRadiusLine * 0.44) + lineDownPx;
		let lineEndY = brainTop - Math.round(brainRadiusLine * 0.2) + lineDownPx;
		if (ring) {
			const ry = parseFloat(ring.getAttribute('y') || '0');
			const rh = parseFloat(ring.getAttribute('height') || '0');
			lineEndY = ry + rh * 0.22 + lineDownPx;
		} else if (node) {
			const repTitle = node.querySelector('.project-node__title-img--repop');
			const tr = repTitle ? repTitle.getBoundingClientRect() : nodeRect;
			lineEndY =
				tr.bottom - containerRect.top + Math.round(tr.height * 0.12) + lineDownPx;
		}
		return {
			brainStartX: centerX,
			brainStartY,
			lineEndX: centerX,
			lineEndY,
		};
	}

	/** iPad landskab: streg hjernen → Byens — centreret mod hjernen + ring (små gaps). */
	function mskByensIpadLandscapeLinePoints(containerRect, brainRect, ring, node, nodeRect) {
		const brainCx = brainRect.left - containerRect.left + brainRect.width / 2;
		const brainCy = brainRect.top - containerRect.top + brainRect.height / 2;
		const brainR = Math.min(brainRect.width, brainRect.height) / 2;

		let ringCx = brainCx - 120;
		let ringCy = brainCy - 140;
		let ringRx = 80;
		let ringRy = 50;
		if (ring) {
			const rx = parseFloat(ring.getAttribute('x') || '0');
			const ry = parseFloat(ring.getAttribute('y') || '0');
			const rw = parseFloat(ring.getAttribute('width') || '0');
			const rh = parseFloat(ring.getAttribute('height') || '0');
			ringCx = rx + rw / 2;
			ringCy = ry + rh / 2;
			ringRx = rw / 2;
			ringRy = rh / 2;
		} else if (node && nodeRect) {
			ringCx = nodeRect.left - containerRect.left + nodeRect.width / 2;
			ringCy = nodeRect.top - containerRect.top + nodeRect.height / 2;
			ringRx = nodeRect.width / 2;
			ringRy = nodeRect.height / 2;
		}

		const dx = ringCx - brainCx;
		const dy = ringCy - brainCy;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;
		const ux = dx / dist;
		const uy = dy / dist;

		const brainStartX = brainCx + ux * (brainR * 0.5);
		const brainStartY = brainCy + uy * (brainR * 0.5);
		const ringGap = Math.max(ringRx, ringRy) * 0.06;
		const lineEndX = ringCx - ux * ringGap;
		const lineEndY = ringCy - uy * ringGap;

		return { brainStartX, brainStartY, lineEndX, lineEndY };
	}

	/** iPad landskab: streg hjernen → BRAINFARTS (efter ring findes). */
	function mskBrainfartsIpadLandscapeLinePoints(containerRect, brainRect, ring, node, nodeRect) {
		const brainCx = brainRect.left - containerRect.left + brainRect.width / 2;
		const brainCy = brainRect.top - containerRect.top + brainRect.height / 2;
		const brainR = Math.min(brainRect.width, brainRect.height) / 2;
		/* + = højre / ned (kun iPad landskab) */
		const lineNudgeX = 14;
		const lineNudgeY = 6;

		let ringCx = brainCx - 140;
		let ringCy = brainCy + 20;
		let ringRx = 90;
		let ringRy = 70;
		if (ring) {
			const rx = parseFloat(ring.getAttribute('x') || '0');
			const ry = parseFloat(ring.getAttribute('y') || '0');
			const rw = parseFloat(ring.getAttribute('width') || '0');
			const rh = parseFloat(ring.getAttribute('height') || '0');
			ringCx = rx + rw / 2;
			ringCy = ry + rh / 2;
			ringRx = rw / 2;
			ringRy = rh / 2;
		} else if (node && nodeRect) {
			ringCx = nodeRect.left - containerRect.left + nodeRect.width / 2;
			ringCy = nodeRect.top - containerRect.top + nodeRect.height / 2;
			ringRx = nodeRect.width / 2;
			ringRy = nodeRect.height / 2;
		}

		const dx = ringCx - brainCx;
		const dy = ringCy - brainCy;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;
		const ux = dx / dist;
		const uy = dy / dist;

		const brainStartX = brainCx + ux * (brainR * 0.48) + lineNudgeX;
		const brainStartY = brainCy + uy * (brainR * 0.48);
		const ringGap = Math.max(ringRx, ringRy) * 0.14;
		const lineEndX = ringCx - ux * ringGap + lineNudgeX;
		const lineEndY = ringCy - uy * ringGap;

		return { brainStartX, brainStartY, lineEndX, lineEndY };
	}

	function mskSyncBrainfartsBrainLineIpadLandscape() {
		try {
			const container = document.querySelector('.brainstorm-container');
			if (!container || container.classList.contains('projects-mindmap--portrait')) return;
			if (!mskIsProjectsTabletLandscapeViewport()) return;
			const currentSvg = document.querySelector('.connecting-lines');
			if (!currentSvg) return;
			const line = currentSvg.querySelector('image.brainfarts-brain-line');
			const ring = currentSvg.querySelector('image.brainfarts-image');
			if (!line) return;

			const containerRect = container.getBoundingClientRect();
			const brain = container.querySelector('.brain');
			if (!brain) return;
			const brainRect = brain.getBoundingClientRect();
			const node = container.querySelector('a[href*="brainfarts"], .project-node[href*="brainfarts"]');
			const nodeRect = node ? node.getBoundingClientRect() : null;
			const pts = mskBrainfartsIpadLandscapeLinePoints(
				containerRect,
				brainRect,
				ring,
				node,
				nodeRect
			);

			const angle =
				(Math.atan2(pts.lineEndY - pts.brainStartY, pts.lineEndX - pts.brainStartX) * 180) /
				Math.PI;
			const lineLength = Math.sqrt(
				(pts.lineEndX - pts.brainStartX) ** 2 + (pts.lineEndY - pts.brainStartY) ** 2
			);
			const bfLineHpx = parseFloat(line.getAttribute('height') || '390');

			line.setAttribute('x', String(pts.brainStartX));
			line.setAttribute('y', String(pts.brainStartY - bfLineHpx / 2));
			line.setAttribute('width', String(Math.max(12, lineLength)));
			line.setAttribute(
				'transform',
				`rotate(${angle} ${pts.brainStartX} ${pts.brainStartY})`
			);
		} catch (_) {}
	}

	function mskSyncByensBrainLineIpadLandscape() {
		try {
			const container = document.querySelector('.brainstorm-container');
			if (!container || container.classList.contains('projects-mindmap--portrait')) return;
			if (!mskIsProjectsTabletLandscapeViewport()) return;
			const currentSvg = document.querySelector('.connecting-lines');
			if (!currentSvg) return;
			const line = currentSvg.querySelector('image.byens-brain-line');
			const ring = currentSvg.querySelector('image.byens-landhandel-image');
			if (!line) return;

			const containerRect = container.getBoundingClientRect();
			const brain = container.querySelector('.brain');
			if (!brain) return;
			const brainRect = brain.getBoundingClientRect();
			const node = container.querySelector('a[href*="byens-landhandel"], .project-node[href*="byens-landhandel"]');
			const nodeRect = node ? node.getBoundingClientRect() : null;
			const pts = mskByensIpadLandscapeLinePoints(
				containerRect,
				brainRect,
				ring,
				node,
				nodeRect
			);

			const angle =
				(Math.atan2(pts.lineEndY - pts.brainStartY, pts.lineEndX - pts.brainStartX) * 180) /
				Math.PI;
			const lineLength = Math.sqrt(
				(pts.lineEndX - pts.brainStartX) ** 2 + (pts.lineEndY - pts.brainStartY) ** 2
			);
			const byensLineHpx = parseFloat(line.getAttribute('height') || '400');

			line.setAttribute('x', String(pts.brainStartX));
			line.setAttribute('y', String(pts.brainStartY - byensLineHpx / 2));
			line.setAttribute('width', String(Math.max(12, lineLength)));
			line.setAttribute(
				'transform',
				`rotate(${angle} ${pts.brainStartX} ${pts.brainStartY})`
			);
		} catch (_) {}
	}

	/** iPad landskab: Repop-streg tegnes før ring — forlæng efter createHandDrawnFrames. */
	function mskSyncRepopBrainLineIpadLandscape() {
		try {
			const container = document.querySelector('.brainstorm-container');
			if (!container || container.classList.contains('projects-mindmap--portrait')) return;
			if (!mskIsProjectsTabletLandscapeViewport()) return;
			const currentSvg = document.querySelector('.connecting-lines');
			if (!currentSvg) return;
			const line = currentSvg.querySelector('image.repop-brain-line');
			const ring = currentSvg.querySelector('image.repop-image');
			if (!line || !ring) return;

			const containerRect = container.getBoundingClientRect();
			const brain = container.querySelector('.brain');
			if (!brain) return;
			const brainRect = brain.getBoundingClientRect();
			const pts = mskRepopIpadLandscapeLinePoints(
				containerRect,
				brainRect,
				ring,
				null,
				null
			);

			const angle =
				(Math.atan2(pts.lineEndY - pts.brainStartY, pts.lineEndX - pts.brainStartX) *
					180) /
				Math.PI;
			const lineLength = Math.sqrt(
				(pts.lineEndX - pts.brainStartX) ** 2 + (pts.lineEndY - pts.brainStartY) ** 2
			);
			const repopLineHpx = parseFloat(line.getAttribute('height') || '332');

			line.setAttribute('x', String(pts.brainStartX));
			line.setAttribute('y', String(pts.brainStartY - repopLineHpx / 2));
			line.setAttribute('width', String(Math.max(12, lineLength)));
			line.setAttribute(
				'transform',
				`rotate(${angle} ${pts.brainStartX} ${pts.brainStartY})`
			);
		} catch (_) {}
	}

	// Create connecting lines from brain to nodes
	function createConnectingLines(options) {
		const forceRedraw = !!(options && options.force);
		console.log('Creating connecting lines...');
		
		// Get fresh references to elements
		const currentSvg = document.querySelector('.connecting-lines');
		const currentBrain = document.querySelector('.brain');
		const currentNodes = document.querySelectorAll('.project-node');
		
		console.log('SVG element:', currentSvg);
		console.log('Brain element:', currentBrain);
		console.log('Nodes found:', currentNodes.length);
		
		if (!currentSvg || !currentBrain || !currentNodes.length) {
			console.log('Missing elements for line creation');
			return;
		}

		if (!forceRedraw && currentSvg.dataset.mskDynamicGraphicsBuilt === '1') return;

		const container = document.querySelector('.brainstorm-container');
		mskEnsureProjectsPortraitSvgBox();
		mskProjectsSyncLayoutBeforePaint();
		if (container && mskIsProjectsPortraitGridDocumentMode()) {
			try {
				container.classList.add('projects-mindmap--portrait');
			} catch (_) {}
		}

		// Remove ONLY dynamic lines/paths we previously created and redraw them.
		// This preserves any static SVG lines in `projects.html` (e.g. NATURLI) and avoids double-stacking.
		currentSvg.querySelectorAll('.dynamic-mindmap-line').forEach(el => el.remove());
		// Note: circles/frames are handled separately by createHandDrawnFrames()
		
		// Note: All existing lines are cleared above, so we start with a clean slate
		
		const brainRect = currentBrain.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();

		// Note: The TWISTER↔D&AD line is handled as a normal positioned <img> for reliability.
		
		// Brain center in SVG user space (container may use CSS transform in phone landscape)
		const brainCenterSvg = svgCenterFromRect(currentSvg, brainRect, containerRect);
		const centerX = brainCenterSvg.x;
		const centerY = brainCenterSvg.y;
		
		// Calculate brain radius to create gap
		const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
		const gapDistance = brainRadius * 1.0; // 100% of brain radius as gap - balanced gap
		/* Linjer under hjernen (TWISTER, KØ-BAJER, BRAINFARTS, KØ→Byens): lidt kortere */
		const underBrainLineLenMul = 0.77;
		/* Hjernen ↔ cirkler: alle segmenter lidt kortere (tykkelse uændret) */
		const mindmapLineLenMul = 0.92;

		let desktopProjectsWide = false;
		let ipadLandscapeLines = false;
		try {
			const iw = mskProjectsLayoutViewportBox().w || 0;
			desktopProjectsWide = iw >= 1025 && !mskIsProjectsShortLandscapeViewport();
			ipadLandscapeLines =
				!!mskIsProjectsTabletLandscapeViewport() &&
				!container.classList.contains('projects-mindmap--portrait');
			if (ipadLandscapeLines) desktopProjectsWide = false;
		} catch (_) {}
		/* Desktop: 0.77 efterlader synligt hul til venstre — næsten fuld længde ud til cirkler */
		const spokeLenMul = desktopProjectsWide ? 0.99 : underBrainLineLenMul;

		/* Kort landscape: tykkelse < 1 — stadig tydelig ift. bobler */
		const lineThicknessMul = mskIsProjectsShortLandscapeViewport() ? 0.55 : 1;
		const lineH = (base) => Math.max(12, Math.round(Number(base) * lineThicknessMul));

		// Portrait mobile: 4 streger hjerte→Durex/Unge/Twister/Kø + 4 cirkel→cirkel (Rep↔Dur …); ikke 8 radiale fra desktop-gren.
		try {
			const iwVp = mskViewportSize().w || 0;
			const ihVp = mskViewportSize().h || 0;
			const lvLine = mskProjectsLayoutViewportBox();
			const iwLv = lvLine.w;
			const ihLv = lvLine.h;
			const cwLine = container
				? Math.round(Math.max(1, container.clientWidth || container.getBoundingClientRect().width))
				: 0;
			/* Samme logik som positionNodesPerfectCircle / usePortraitSketchGrid — ellers ellipse-noder + radiale streger */
			const isPortraitMindmap =
				!!(container && container.classList && container.classList.contains('projects-mindmap--portrait'));
			let portraitOrientationChain = false;
			try {
				portraitOrientationChain = !!(window.matchMedia && window.matchMedia('(orientation: portrait)').matches);
			} catch (_) {
				portraitOrientationChain = false;
			}
			/* Når matchMedia siger landscape men layout-viewport er portræt (DevTools/Safari), ellers 8 radiale streger. */
			if (
				!portraitOrientationChain &&
				ihLv >= iwLv &&
				!mskIsProjectsTabletLandscapeViewport() &&
				!document.documentElement.classList.contains('msk-projects-ipad-landscape')
			) {
				portraitOrientationChain = true;
			}
			let phonePortraitMediaChain = false;
			try {
				phonePortraitMediaChain = !!(
					window.matchMedia &&
					window.matchMedia('(max-width: 640px) and (orientation: portrait)').matches
				);
			} catch (_) {}
			const tabletPortraitProjectsChain =
				!!(
					document.body &&
					document.body.classList.contains('projects-page') &&
					mskIsProjectsTabletPortraitViewport()
				);
			const phonePortraitProjectsChain =
				!!(
					document.body &&
					document.body.classList.contains('projects-page') &&
					mskIsProjectsPhonePortraitViewport()
				);
			const portraitSketchLikeGrid =
				document.body &&
				document.body.classList.contains('projects-page') &&
				!mskIsProjectsTabletLandscapeViewport() &&
				!mskIsProjectsShortLandscapeViewport() &&
				(isPortraitMindmap ||
					mskIsProjectsPortraitGridDocumentMode() ||
					mskIsProjectsPortraitSketchGridViewport() ||
					(portraitOrientationChain &&
						(phonePortraitMediaChain ||
							cwLine <= 640 ||
							tabletPortraitProjectsChain ||
							phonePortraitProjectsChain)));
			let isMobileProjects =
				isPortraitMindmap ||
				portraitSketchLikeGrid ||
				(iwVp > 0 && ihVp > 0 && iwVp <= 640 && ihVp >= iwVp);
			/* Kort landscape: slå portrait-kæde fra — ikke når vi allerede er i portræt-skitse (klasse eller samme MQ som grid). */
			try {
				if (
					mskIsProjectsShortLandscapeViewport() &&
					ihLv < iwLv &&
					!isPortraitMindmap &&
					!portraitSketchLikeGrid
				) {
					isMobileProjects = false;
				}
			} catch (_) {}
			try {
				if (mskIsProjectsPhonePortraitViewport() || mskIsProjectsTabletPortraitViewport()) {
					isMobileProjects = true;
				}
			} catch (_) {}
			if (mskIsProjectsPortraitGridDocumentMode() && !mskIsProjectsTabletLandscapeViewport()) {
				isMobileProjects = true;
			}
			const portraitGridLines =
				isPortraitMindmap || portraitSketchLikeGrid || mskIsProjectsPortraitSketchGridViewport();
			let portraitLineScale = 1;
			try {
				if (portraitGridLines) portraitLineScale = mskProjectsPortraitReferenceScale();
			} catch (_) {}
			let phoneLineAdj = 1;
			try {
				if (
					phonePortraitProjectsChain &&
					!tabletPortraitProjectsChain &&
					typeof mskGetPhonePortraitProfileFactors === 'function'
				) {
					phoneLineAdj = mskGetPhonePortraitProfileFactors().lineAdj || 1;
				}
			} catch (_) {}
			if (isMobileProjects) {
				const scale = 1;
				const phonePortraitLineMul =
					phonePortraitProjectsChain && !tabletPortraitProjectsChain ? phoneLineAdj : 1;
				const svgScale = (n) =>
					n * scale * (portraitGridLines ? portraitLineScale : 1) * phonePortraitLineMul;
				/* Kun portræt-grid: træk hjernestregerne til Twister/Kø-Bajer lidt op (matcher højere noder) */
				const portraitUnderBrainStrokePullUp =
					portraitGridLines ? svgScale(16) : 0;
				/* Kun portræt: venstre streg (Twister) lidt højere end højre (Kø-Bajer) */
				const portraitUnderBrainLeftStrokeExtraPullUp =
					portraitGridLines ? svgScale(12) : 0;
				/* Øvre kæde (Rep↔Dur, Dur↔hjerne, Nat↔Ung, Ung↔hjerne): ekstra forkortelse */
				const portraitUpperLineMul =
					phonePortraitProjectsChain && !tabletPortraitProjectsChain
						? 0.88 * phoneLineAdj
						: 0.88;
				const phoneBrainStrokeMul =
					phonePortraitProjectsChain &&
					!tabletPortraitProjectsChain &&
					portraitGridLines
						? 1.78
						: 1;
				try {
					currentSvg.querySelectorAll('.mindmap-line:not(.dynamic-mindmap-line)').forEach((el) => {
						el.dataset.mobileHidden = '1';
						el.style.setProperty('display', 'none', 'important');
						el.style.setProperty('opacity', '0', 'important');
						el.style.setProperty('visibility', 'hidden', 'important');
					});
				} catch {}

				const findNode = (hrefPart) =>
					Array.from(currentNodes).find((n) =>
						((n.getAttribute('href') || '').toLowerCase()).includes(hrefPart)
					);

				const repop = findNode('repop');
				const naturli = findNode('naturli');
				const durex = findNode('durex');
				const unge = findNode('unge-mod-uv');
				const twister = findNode('twister');
				const kobajer = findNode('kobajer');
				const brainfarts = findNode('brainfarts');
				const byens = findNode('byens-landhandel');

				const pt = (rect, kind) => {
					if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
					const cx = rect.left + rect.width / 2;
					const cy = rect.top + rect.height / 2;
					let px = cx;
					let py = cy;
					if (kind === 'top') py = rect.top;
					else if (kind === 'bottom') py = rect.top + rect.height;
					else if (kind === 'left') px = rect.left;
					else if (kind === 'right') px = rect.left + rect.width;
					return mskSvgPointFromClientPx(currentSvg, px, py);
				};

				const lineImg = (assetPath, a, b, heightPx, opts) => {
					if (!a || !b) return;
					opts = opts || {};
					const gapA = opts.gapA !== undefined ? opts.gapA : svgScale(8);
					const gapB = opts.gapB !== undefined ? opts.gapB : svgScale(8);
					const lenMul = opts.lenMul != null ? opts.lenMul : 1;
					const angleOffsetDeg = opts.angleOffsetDeg != null ? opts.angleOffsetDeg : 0;
					const ax = a.x, ay = a.y;
					const bx = b.x, by = b.y;
					const dx = bx - ax;
					const dy = by - ay;
					const dist = Math.sqrt(dx * dx + dy * dy) || 1;
					const ux = dx / dist;
					const uy = dy / dist;
					const sx = ax + ux * gapA;
					const sy = ay + uy * gapA;
					const ex = bx - ux * gapB;
					const ey = by - uy * gapB;
					let len = Math.max(0, Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2)) * lenMul * mindmapLineLenMul;
					if (len < 6) return;
					let angle = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI + angleOffsetDeg;
					const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
					img.setAttribute('href', assetPath);
					img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', assetPath);
					img.setAttribute('x', String(sx));
					img.setAttribute('y', String(sy - (heightPx / 2)));
					img.setAttribute('width', String(len));
					img.setAttribute('height', String(heightPx));
					img.setAttribute('opacity', '1');
					img.setAttribute('preserveAspectRatio', 'none');
					img.setAttribute('transform', `rotate(${angle} ${sx} ${sy})`);
					img.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line');
					img.style.pointerEvents = 'none';
					img.style.display = 'block';
					img.style.visibility = 'visible';
					img.style.imageRendering = 'crisp-edges';
					img.style.filter = 'none';
					currentSvg.appendChild(img);
				};

				const bRect = currentBrain.getBoundingClientRect();
				const brainTop = pt(bRect, 'top');
				const brainBottom = pt(bRect, 'bottom');
				const brainLeft = pt(bRect, 'left');
				const brainRight = pt(bRect, 'right');

				const repRect = repop && repop.getBoundingClientRect();
				const natRect = naturli && naturli.getBoundingClientRect();
				const durRect = durex && durex.getBoundingClientRect();
				const ungRect = unge && unge.getBoundingClientRect();
				const twiRect = twister && twister.getBoundingClientRect();
				const kobRect = kobajer && kobajer.getBoundingClientRect();
				const brfRect = brainfarts && brainfarts.getBoundingClientRect();
				const byeRect = byens && byens.getBoundingClientRect();

				/* Kun portræt: Repop↔Durex-stregen lidt ned */
				const repDurexPortraitLineDy = portraitGridLines ? svgScale(10) : 0;
				/* Kun portræt: Tw↔Brainfarts og Kø↔Byens — mindre “shift up” så stregen sætter lidt lavere */
				const portraitBottomRowLineTune = portraitGridLines;

				if (repRect && durRect) {
					const repBot = pt(repRect, 'bottom');
					const durTop = pt(durRect, 'top');
					let repDurexLineH = svgScale(210);
					let repDurexIpadPortraitExtraDy = 0;
					let repDurexGapA = svgScale(2);
					let repDurexGapB = svgScale(2);
					let repDurexLenMul = 1.04 * portraitUpperLineMul;
					try {
						if (portraitGridLines) {
							const ic = mskIpadPortraitLineLock('repDurex');
							if (ic) {
								repDurexLineH = svgScale(ic.lineH);
								repDurexIpadPortraitExtraDy = svgScale(ic.extraDy);
								repDurexGapA = svgScale(ic.gapA);
								repDurexGapB = svgScale(ic.gapB);
								repDurexLenMul = ic.lenMul;
							} else {
								repDurexLineH = svgScale(252);
								repDurexIpadPortraitExtraDy = svgScale(7);
								repDurexGapA = svgScale(34);
							}
						}
					} catch (_) {}
					let repDurexA = {
						x: repBot.x,
						y: repBot.y + repDurexPortraitLineDy + repDurexIpadPortraitExtraDy,
					};
					let repDurexB = {
						x: durTop.x,
						y: durTop.y + repDurexPortraitLineDy + repDurexIpadPortraitExtraDy,
					};
					/* Telefon portræt: Repop→Durex (Linje 2) længere + tykkere */
					if (
						phonePortraitProjectsChain &&
						!tabletPortraitProjectsChain &&
						portraitGridLines
					) {
						repDurexLenMul *= 1.82;
						repDurexLineH *= 1.42;
						repDurexGapA = -svgScale(8);
						repDurexGapB = -svgScale(16);
						const phoneRepDurLen = svgScale(34);
						repDurexA.y += phoneRepDurLen;
						repDurexB.y -= phoneRepDurLen * 0.95;
						repDurexA.y -= svgScale(6);
					}
					lineImg(
						'assets/Linje 2.webp',
						repDurexA,
						repDurexB,
						repDurexLineH,
						{
							gapA: repDurexGapA,
							gapB: repDurexGapB,
							lenMul: repDurexLenMul,
						}
					);
				}
				if (durRect) {
					const bh = (brainBottom.y - brainTop.y) || 1;
					let a = mskSvgPointFromClientPx(
						currentSvg,
						durRect.right - durRect.width * 0.30,
						durRect.top + durRect.height * 0.72
					);
					let b = { x: brainLeft.x + svgScale(52), y: brainTop.y + bh * 0.30 };
					let durexGapA = svgScale(8);
					let durexGapB = svgScale(13);
					let durexLenMul = portraitUpperLineMul;
					let durexLineH = svgScale(220);
					try {
						if (portraitGridLines) {
							const ic = mskIpadPortraitLineLock('durexBrain');
							if (ic) {
								const durexBrainIpadDy = svgScale(ic.brainIpadDy);
								a.y += durexBrainIpadDy;
								b.y += durexBrainIpadDy + svgScale(ic.brainExtraDy);
								durexGapB = svgScale(ic.gapB);
								durexLenMul = ic.lenMul;
								durexLineH = svgScale(ic.lineH);
							} else {
								const durexBrainIpadDy = svgScale(24);
								a.y += durexBrainIpadDy;
								b.y += durexBrainIpadDy + svgScale(26);
								durexGapB = -svgScale(10);
								durexLenMul = portraitUpperLineMul * 1.16;
								durexLineH = svgScale(318);
							}
						}
					} catch (_) {}
					durexLineH *= phoneBrainStrokeMul;
					lineImg('assets/linje 6.webp', a, b, durexLineH, {
						gapA: durexGapA,
						gapB: durexGapB,
						lenMul: durexLenMul,
					});
				}
				if (twiRect) {
					const shiftX = svgScale(36);
					const twBrainLineDy = svgScale(18);
					const twPortraitPullUp =
						portraitUnderBrainStrokePullUp + portraitUnderBrainLeftStrokeExtraPullUp;
					const a = {
						x: brainLeft.x - svgScale(6) + shiftX,
						y: brainBottom.y - svgScale(58) + twBrainLineDy - twPortraitPullUp,
					};
					/* Slut tættere på TWISTER-boblen (længere ud mod twister) */
					let b = {
						x: pt(twiRect, 'left').x - svgScale(28) + shiftX,
						y: pt(twiRect, 'top').y - svgScale(14) + twBrainLineDy - twPortraitPullUp,
					};
					/* Ren rotation set ovenfra (ikke flytte ankre); negativ grader = mod venstre i SVG */
					let twBrainAngleOffset = -34;
					let twBrainGapA = -svgScale(14);
					let twBrainGapB = -svgScale(10);
					let twBrainLenMul = underBrainLineLenMul * 0.98;
					let twBrainLineH = svgScale(175);
					try {
						if (portraitGridLines) {
							const ic = mskIpadPortraitLineLock('twBrain');
							if (ic) {
								const twTop = pt(twiRect, 'top');
								const twMid = pt(twiRect, 'center');
								b = {
									x: twMid.x + svgScale(14) + shiftX,
									y: twTop.y + svgScale(10) + svgScale(38) + twBrainLineDy - twPortraitPullUp,
								};
								twBrainAngleOffset = ic.angleOffset;
								twBrainGapB = svgScale(ic.gapB);
								twBrainLenMul = underBrainLineLenMul * ic.lenMul;
								twBrainLineH = svgScale(ic.lineH);
							} else {
								const twTop = pt(twiRect, 'top');
								const twMid = pt(twiRect, 'center');
								b = {
									x: twMid.x + svgScale(14) + shiftX,
									y: twTop.y + svgScale(10) + svgScale(38) + twBrainLineDy - twPortraitPullUp,
								};
								twBrainAngleOffset = -10;
								twBrainGapB = -svgScale(30);
								twBrainLenMul = underBrainLineLenMul * 1.22;
								twBrainLineH = svgScale(278);
							}
						}
					} catch (_) {}
					twBrainLineH *= phoneBrainStrokeMul;
					lineImg('assets/linje 8.webp', a, b, twBrainLineH, {
						gapA: twBrainGapA,
						gapB: twBrainGapB,
						lenMul: twBrainLenMul,
						angleOffsetDeg: twBrainAngleOffset,
					});
				}
				if (twiRect && brfRect) {
					const twBrfDown = svgScale(8);
					let twBrfShiftUp = svgScale(portraitBottomRowLineTune ? 28 : 22);
					let twBrfGapA = -svgScale(16);
					let twBrfGapB = svgScale(0);
					let twBrfLenMul = 1.58;
					const twBot = pt(twiRect, 'bottom');
					const bfTop = pt(brfRect, 'top');
					let twBrfLineH = svgScale(232);
					let a = { x: twBot.x, y: twBot.y + twBrfDown - twBrfShiftUp };
					let b = { x: bfTop.x, y: bfTop.y + twBrfDown - twBrfShiftUp };
					try {
						if (portraitGridLines) {
							const ic = mskIpadPortraitLineLock('twBrainfarts');
							if (ic) {
								twBrfShiftUp = svgScale(ic.shiftUp);
								a.y = twBot.y + twBrfDown - twBrfShiftUp - svgScale(ic.liftExtra);
								b.y =
									bfTop.y + twBrfDown - twBrfShiftUp - svgScale(ic.liftExtra) + svgScale(ic.bfDownExtra);
								twBrfLineH = svgScale(ic.lineH);
								twBrfGapA = svgScale(ic.gapA);
								twBrfGapB = svgScale(ic.gapB);
								twBrfLenMul = ic.lenMul;
							} else {
								twBrfShiftUp = svgScale(48);
								a.y = twBot.y + twBrfDown - twBrfShiftUp - svgScale(12);
								b.y = bfTop.y + twBrfDown - twBrfShiftUp - svgScale(12) + svgScale(10);
								twBrfLineH = svgScale(322);
								twBrfGapA = svgScale(8);
								twBrfGapB = svgScale(2);
								twBrfLenMul = 1.34;
							}
						}
					} catch (_) {}
					/* Telefon portræt: Twister→Brainfarts (linje 3) længere */
					if (
						phonePortraitProjectsChain &&
						!tabletPortraitProjectsChain &&
						portraitGridLines
					) {
						twBrfLenMul *= 1.28;
						const phoneTwBrfLen = svgScale(16);
						a.y += phoneTwBrfLen;
						b.y -= phoneTwBrfLen * 0.9;
						twBrfGapA = -svgScale(8);
						twBrfGapB = -svgScale(6);
					}
					lineImg(
						'assets/linje 3.webp',
						a,
						b,
						twBrfLineH,
						{
							gapA: twBrfGapA,
							gapB: twBrfGapB,
							lenMul: twBrfLenMul,
						}
					);
				}

				if (natRect && ungRect) {
					/* Smallere (lavere height) men lidt længere (højere lenMul + lidt mindre gap) */
					const natBottomPt = pt(natRect, 'bottom');
					const ungTopPt = pt(ungRect, 'top');
					let natUngA = natBottomPt;
					let natUngB = ungTopPt;
					let natUngGapA = svgScale(6);
					let natUngGapB = svgScale(10);
					let natUngLenMul = portraitUpperLineMul * 1.1;
					let natUngLineH = svgScale(158);
					/* iPad 641–1024 portræt + lodret mindmap: længere lodret streg Nat' → UNGE */
					try {
						if (portraitGridLines) {
							const ic = mskIpadPortraitLineLock('natUng');
							if (ic) {
								natUngA = {
									x: natBottomPt.x,
									y: natBottomPt.y - svgScale(ic.aLift) - svgScale(ic.liftY),
								};
								natUngB = {
									x: ungTopPt.x,
									y: ungTopPt.y + svgScale(ic.bDrop) - svgScale(ic.liftY),
								};
								natUngGapA = svgScale(ic.gapA);
								natUngGapB = svgScale(ic.gapB);
								natUngLenMul = ic.lenMul;
								natUngLineH = svgScale(ic.lineH);
							} else {
								const natUngIpadLiftY = svgScale(14);
								natUngA = {
									x: natBottomPt.x,
									y: natBottomPt.y - svgScale(26) - natUngIpadLiftY,
								};
								natUngB = {
									x: ungTopPt.x,
									y: ungTopPt.y + svgScale(26) - natUngIpadLiftY,
								};
								natUngGapA = svgScale(2);
								natUngGapB = svgScale(4);
								natUngLenMul = portraitUpperLineMul * 1.32;
								natUngLineH = svgScale(198);
							}
						}
					} catch (_) {}
					/* Telefon portræt: Naturli'→Unge Mod UV (linje 7) længere ned mod Unge */
					if (
						phonePortraitProjectsChain &&
						!tabletPortraitProjectsChain &&
						portraitGridLines
					) {
						natUngLenMul *= 1.22;
						const phoneNatUngExtend = svgScale(18);
						natUngB.y += phoneNatUngExtend;
						natUngGapB = -svgScale(8);
					}
					lineImg('assets/linje 7.webp', natUngA, natUngB, natUngLineH, {
						gapA: natUngGapA,
						gapB: natUngGapB,
						lenMul: natUngLenMul,
					});
				}
				if (ungRect) {
					const ungeLineDy = svgScale(16);
					const bh = (brainBottom.y - brainTop.y) || 1;
					let a = mskSvgPointFromClientPx(
						currentSvg,
						ungRect.left + ungRect.width * 0.34,
						ungRect.top + ungRect.height * 0.62
					);
					a.y += ungeLineDy;
					let b = { x: brainRight.x - svgScale(52), y: brainTop.y + bh * 0.30 + ungeLineDy };
					let ungeGapA = svgScale(4);
					let ungeGapB = svgScale(5);
					let ungeLenMul = portraitUpperLineMul * 1.08;
					let ungeLineH = svgScale(220);
					try {
						if (portraitGridLines) {
							const ic = mskIpadPortraitLineLock('ungeBrain');
							if (ic) {
								b.y += svgScale(ic.bExtraDy);
								ungeGapB = svgScale(ic.gapB);
								ungeLenMul = ic.lenMul;
								ungeLineH = svgScale(ic.lineH);
							} else {
								b.y += svgScale(16);
								ungeGapB = -svgScale(6);
								ungeLenMul = portraitUpperLineMul * 1.12;
								ungeLineH = svgScale(268);
							}
						}
					} catch (_) {}
					ungeLineH *= phoneBrainStrokeMul;
					lineImg('assets/linje 5.webp', a, b, ungeLineH, {
						gapA: ungeGapA,
						gapB: ungeGapB,
						lenMul: ungeLenMul,
					});
				}
				if (kobRect) {
					const a = {
						x: brainRight.x - svgScale(52),
						y: brainBottom.y - svgScale(58) - portraitUnderBrainStrokePullUp,
					};
					const kobTop = pt(kobRect, 'top');
					const b = {
						x:
							mskSvgPointFromClientPx(
								currentSvg,
								kobRect.left + kobRect.width * 0.32,
								kobRect.top
							).x - svgScale(4),
						y: kobTop.y - svgScale(14) - portraitUnderBrainStrokePullUp,
					};
					let kobBrainLineH = svgScale(235) * phoneBrainStrokeMul;
					let kobBrainGapA = -svgScale(14);
					let kobBrainGapB = svgScale(2);
					let kobBrainLenMul = underBrainLineLenMul * 1.38;
					if (
						phonePortraitProjectsChain &&
						!tabletPortraitProjectsChain &&
						portraitGridLines
					) {
						/* Forkort kun nedefra (Kø-Bajer-cirkel) — ikke fra hjernen */
						kobBrainGapB = svgScale(62);
					}
					lineImg('assets/Linje 4.webp', a, b, kobBrainLineH, {
						gapA: kobBrainGapA,
						gapB: kobBrainGapB,
						lenMul: kobBrainLenMul,
					});
				}
				if (kobRect && byeRect) {
					const kobByeDown = svgScale(22);
					/* Samme længde/vinkel — parallelforskydning op + mod venstre; portræt: lidt mindre op-træk */
					let kobByeShiftUpPx = portraitBottomRowLineTune ? 44 : 54;
					try {
						const icShift = mskIpadPortraitLineLock('kobBye');
						if (icShift && icShift.shiftUp != null) kobByeShiftUpPx = icShift.shiftUp;
					} catch (_) {}
					const kobByeShiftUp = svgScale(kobByeShiftUpPx);
					const kobByeShiftLeft = svgScale(18);
					const a0 = pt(kobRect, 'bottom');
					const b0 = pt(byeRect, 'top');
					/* iPad 641–1024 portræt + lodret mindmap: længere streg Kø → Byens (kun her) */
					let kobByeTopInsetX = svgScale(34);
					let kobByeLenMul = 1.88;
					let kobByeStartNudgeX = 0;
					try {
						if (portraitGridLines) {
							const ic = mskIpadPortraitLineLock('kobBye');
							if (ic) {
								kobByeTopInsetX = svgScale(ic.topInsetX);
								kobByeLenMul = ic.lenMul;
								kobByeStartNudgeX = svgScale(ic.startNudgeX);
							} else {
								kobByeTopInsetX = svgScale(84);
								kobByeLenMul = 2.24;
								kobByeStartNudgeX = -svgScale(24);
							}
						}
					} catch (_) {}
					const a = {
						x: a0.x - kobByeShiftLeft + kobByeStartNudgeX,
						y: a0.y + kobByeDown - kobByeShiftUp,
					};
					const b = {
						x: b0.x + kobByeTopInsetX - kobByeShiftLeft,
						y: b0.y + kobByeDown - kobByeShiftUp,
					};
					/* iPad portræt mindmap: loddret; forkort mest fra nedefra (Byens-ende) */
					let kobByeLineH = svgScale(220);
					let kobByeLineGapA = -svgScale(8);
					let kobByeLineGapB = -svgScale(8);
					try {
						if (portraitGridLines) {
							const ic = mskIpadPortraitLineLock('kobBye');
							if (ic) {
								a.x += svgScale(ic.alignX);
								b.x = a.x;
								a.y -= svgScale(ic.ipadLift);
								b.y -= svgScale(ic.ipadLift);
								b.y -= svgScale(ic.bfExtraUp);
								a.y += svgScale(ic.portraitDown);
								b.y += svgScale(ic.portraitDown);
								kobByeLineGapB = svgScale(ic.gapB);
								kobByeLineH = svgScale(ic.lineH);
							} else {
								a.x += svgScale(52);
								b.x = a.x;
								const kobByeIpadLift = svgScale(10);
								a.y -= kobByeIpadLift;
								b.y -= kobByeIpadLift;
								b.y -= svgScale(10);
								const kobByePortraitDown = svgScale(14);
								a.y += kobByePortraitDown;
								b.y += kobByePortraitDown;
								kobByeLineGapB = svgScale(14);
								kobByeLineH = svgScale(268);
							}
						}
					} catch (_) {}
					if (
						phonePortraitProjectsChain &&
						!tabletPortraitProjectsChain &&
						portraitGridLines
					) {
						/* Kø-Bajer → Byens: forkort nedefra (Byens-cirkel) */
						kobByeLenMul *= 0.84;
						kobByeLineGapB = svgScale(36);
						b.y -= svgScale(22);
						const phoneKobByeLift = svgScale(14);
						a.y -= phoneKobByeLift;
						b.y -= phoneKobByeLift;
					}
					/* lenMul ganges kun med mindmapLineLenMul i lineImg — ikke underBrainLineLenMul (0.77), ellers blev strækket næsten usynligt */
					lineImg('assets/linje 1.webp', a, b, kobByeLineH, {
						gapA: kobByeLineGapA,
						gapB: kobByeLineGapB,
						lenMul: kobByeLenMul,
					});
				}

				return;
			}
		} catch {}

		/* Portræt-grid (telefon + tablet): aldrig 8 radiale desktop-streger ovenpå kæde-layoutet */
		try {
			if (
				container &&
				(container.classList.contains('projects-mindmap--portrait') ||
					mskIsProjectsPortraitGridDocumentMode() ||
					mskIsProjectsPortraitSketchGridViewport())
			) {
				return;
			}
		} catch (_) {}

		// If we previously hid static lines for mobile, restore them for desktop/tablet.
		try {
			currentSvg.querySelectorAll('.mindmap-line[data-mobile-hidden="1"]').forEach((el) => {
				el.removeAttribute('data-mobile-hidden');
				el.style.removeProperty('display');
				el.style.removeProperty('opacity');
				el.style.removeProperty('visibility');
			});
		} catch {}
		
		console.log('Brain center:', centerX, centerY);
		console.log('Container dimensions:', containerRect.width, containerRect.height);
		
		// Create hand-drawn lines to each project node
		currentNodes.forEach((node, index) => {
			if (container && container.classList.contains('projects-mindmap--portrait')) return;
			const nodeRect = node.getBoundingClientRect();
			const nodeCenterSvg = svgCenterFromRect(currentSvg, nodeRect, containerRect);
			const nodeX = nodeCenterSvg.x;
			const nodeY = nodeCenterSvg.y;
			
			console.log(`Node ${index} (${node.textContent.trim()}):`, nodeX, nodeY);
			
			// Check if node has valid dimensions
			if (nodeRect.width === 0 || nodeRect.height === 0) {
				console.log(`Node ${index} has zero dimensions! Skipping line creation.`);
				return;
			}
			
			// Special case: BRAINFARTS - render linje 8.webp asset line from brain center to node
			const nodeTextBrainfarts = node.textContent.trim();
			const nodeHrefBrainfarts = node.getAttribute('href') || '';
			if (nodeTextBrainfarts === 'BRAINFARTS' || nodeHrefBrainfarts.includes('brainfarts') || nodeHrefBrainfarts.includes('project1')) {
				console.log(`✓ BRAINFARTS detected at index ${index} - creating Linje 8.webp asset line`);
				
				const bfShortLs = mskIsProjectsShortLandscapeViewport();
				let brainStartX;
				let brainStartY;
				let lineEndX;
				let lineEndY;
				if (ipadLandscapeLines) {
					const pts = mskBrainfartsIpadLandscapeLinePoints(
						containerRect,
						brainRect,
						null,
						node,
						nodeRect
					);
					brainStartX = pts.brainStartX;
					brainStartY = pts.brainStartY;
					lineEndX = pts.lineEndX;
					lineEndY = pts.lineEndY;
				} else {
					// Start from slightly backward of the brain center (extending toward brain)
					const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
					const deltaX = nodeX - centerX;
					const deltaY = nodeY - centerY;
					const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
					// Extend backward from brain center to make line longer toward brain (desktop: længere i begge ender)
					const brainExtension = brainRadius * (desktopProjectsWide ? 0.52 : 0.38);
					brainStartX = centerX - (deltaX / distance) * brainExtension;
					brainStartY = centerY - (deltaY / distance) * brainExtension;
					
					// Calculate end point - extend closer to/past the BRAINFARTS node
					const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
					const bfExtensionMul = bfShortLs ? 2.06 : desktopProjectsWide ? 2.82 : 1.28;
					const extensionAmount = nodeRadius * bfExtensionMul;
					lineEndX = nodeX + (deltaX / distance) * extensionAmount;
					lineEndY = nodeY + (deltaY / distance) * extensionAmount;
				}
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2) * spokeLenMul;
				const bfWidthMul = ipadLandscapeLines ? 1 : bfShortLs ? 1.14 : 1;
				
				console.log('BRAINFARTS Linje 8 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 8.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 8.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', String(brainStartY - lineH(390) / 2)); // half of scaled line height
				lineImage.setAttribute('width', lineLength * mindmapLineLenMul * bfWidthMul);
				lineImage.setAttribute('height', String(lineH(390)));
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add(
					'mindmap-line',
					'dynamic-mindmap-line',
					'mobile-mindmap-line',
					'brainfarts-brain-line'
				);
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log(`✓ BRAINFARTS linje 8.webp asset line created and added to SVG`);
				return; // Skip the hand-drawn line creation for BRAINFARTS
			}
			
			// Special case: KØ-BAJER - render linje 4.webp asset line from brain center to node
			const nodeTextKobajer = node.textContent.trim();
			const nodeHrefKobajer = node.getAttribute('href') || '';
			if (nodeTextKobajer === 'KØ-BAJER' || nodeHrefKobajer.includes('kobajer')) {
				console.log(`✓ KØ-BAJER detected at index ${index} - creating Linje 4.webp asset line`);
				
				// Start from slightly backward of the brain center (extending toward brain)
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const deltaX = nodeX - centerX;
				const deltaY = nodeY - centerY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Extend backward from brain center to make line longer toward brain
				const brainExtension = brainRadius * 0.1; // Extend 10% of brain radius backward (slightly longer)
				const brainStartX = centerX - (deltaX / distance) * brainExtension;
				const brainStartY = centerY - (deltaY / distance) * brainExtension;
				
				// Calculate end point - extend to/past the KØ-BAJER node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				// Kort mobil-landscape: længere ud mod Kø-Bajer-boblen
				const kobShortLs = mskIsProjectsShortLandscapeViewport();
				const extensionMul = kobShortLs ? 2.02 : desktopProjectsWide ? 1.92 : 1.36;
				const extensionAmount = nodeRadius * extensionMul;
				const lineEndX = nodeX + (deltaX / distance) * extensionAmount;
				const lineEndY = nodeY + (deltaY / distance) * extensionAmount;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2) * spokeLenMul;
				const kobWidthMul = kobShortLs ? 1.12 : 1;
				
				console.log('KØ-BAJER Linje 4 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line - use same pattern as BRAINFARTS
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/Linje 4.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/Linje 4.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', String(brainStartY - lineH(400) / 2));
				lineImage.setAttribute('width', lineLength * mindmapLineLenMul * kobWidthMul);
				lineImage.setAttribute('height', String(lineH(400)));
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log('✓ KØ-BAJER Linje 4.webp asset line created and added to SVG');
				
				return; // Skip further hand-drawn processing for KØ-BAJER
			}
			
			// Special case: DUREX X GUESS WHO - render linje 6.webp asset line from brain center to node
			const nodeTextDurex = node.textContent.trim();
			const nodeHrefDurex = node.getAttribute('href') || '';
			if (nodeTextDurex === 'DUREX X GUESS WHO' || nodeHrefDurex.includes('durex')) {
				console.log(`✓ DUREX X GUESS WHO detected at index ${index} - creating linje 6.webp asset line`);
				
				// Start from the center of the brain
				const brainCenterX = centerX;
				const brainCenterY = centerY;
				
				// Calculate end point - stop before reaching the DUREX node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const deltaX = nodeX - brainCenterX;
				const deltaY = nodeY - brainCenterY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Stop før/ved node-cirklen. Desktop: tæt på centrum; ellers ældre større hul.
				let durexGapMul = desktopProjectsWide ? 0.02 : 0.32;
				if (ipadLandscapeLines) durexGapMul = 0.64;
				const gapDistance = nodeRadius * durexGapMul;
				const lineEndX = nodeX - (deltaX / distance) * gapDistance;
				const lineEndY = nodeY - (deltaY / distance) * gapDistance;
				
				// Add gap from brain center (smaller gap => longer toward brain)
				const brainGapDistance = nodeRadius * 0.08; // Smaller gap => longer toward brain
				const brainStartX = brainCenterX + (deltaX / distance) * brainGapDistance;
				const brainStartY = brainCenterY + (deltaY / distance) * brainGapDistance;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const calculatedLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				const lineLength = calculatedLength; // Use full length
				/* Uden denne: mindmapLineLenMul (0.92) forkorter <image width> så streget stopper synligt før lineEnd — hul mod Durex-cirklen */
				let durexLineWidthMul = desktopProjectsWide ? 1 : mindmapLineLenMul;
				if (ipadLandscapeLines) durexLineWidthMul = 1;
				
				console.log('DUREX linje 6 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 6.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 6.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', String(brainStartY - lineH(300) / 2));
				lineImage.setAttribute('width', lineLength * durexLineWidthMul);
				lineImage.setAttribute('height', String(lineH(300)));
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log('✓ DUREX linje 6.webp asset line created and added to SVG');
				
				return; // Skip further hand-drawn processing for DUREX
			}
			
			// Special case: UNGE MOD UV - render linje 5.webp asset line from brain center to node (down to the right)
			const nodeTextUngeModUv = node.textContent.trim();
			const nodeHrefUngeModUv = node.getAttribute('href') || '';
			if (nodeTextUngeModUv === 'UNGE MOD UV' || nodeHrefUngeModUv.includes('unge-mod-uv')) {
				console.log(`✓ UNGE MOD UV detected at index ${index} - creating linje 5.webp asset line (down to the right)`);
				
				// Start from the center of the brain, extended backward toward brain
				const brainCenterX = centerX;
				const brainCenterY = centerY;

				/* Telefon landscape (lav/bred): linje lidt op + mod venstre — mskIsProjectsShortLandscapeViewport */
				let ungeLinePressDown = 16;
				let ungeLineShiftLeft = 0;
				let ungeShortenFromNodeEndPx = 0;
				if (mskIsProjectsShortLandscapeViewport()) {
					ungeLinePressDown = -8;
					ungeLineShiftLeft = -42;
					ungeShortenFromNodeEndPx = 22;
				} else {
					/* Desktop m.m.: forkort mod UNGE-boblen — slutpunkt trækkes mod hjernen langs stregen */
					ungeShortenFromNodeEndPx = 34;
				}
				
				// Calculate end point - extend closer to/past the UNGE MOD UV node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const deltaX = nodeX - brainCenterX;
				const deltaY = nodeY - brainCenterY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Slut tættere på cirklen i landscape (mindre “stik ind i teksten”) — lidt længere ud mod boblen
				const extensionAmount =
					mskIsProjectsShortLandscapeViewport() ? nodeRadius * 0.4 : nodeRadius * 0.55;
				let lineEndX = nodeX + (deltaX / distance) * extensionAmount;
				let lineEndY = nodeY + (deltaY / distance) * extensionAmount;
				lineEndX += ungeLineShiftLeft;
				
				// Add gap from brain center, then extend backward toward brain
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const brainGapDistance = nodeRadius * 0.4; // Gap from brain center
				const initialBrainStartX = brainCenterX + (deltaX / distance) * brainGapDistance;
				const initialBrainStartY = brainCenterY + (deltaY / distance) * brainGapDistance;
				
				// Extend backward from initial start point to make line longer toward brain
				const brainExtension = brainRadius * 0.1; // Extend 10% of brain radius backward (slightly longer)
				let brainStartX = initialBrainStartX - (deltaX / distance) * brainExtension;
				const brainStartY = initialBrainStartY - (deltaY / distance) * brainExtension;
				brainStartX += ungeLineShiftLeft;
				/* Forkort mod UNGE-enden: træk slutpunkt mod hjernen langs segmentet (ikke fra hjernen) */
				if (ungeShortenFromNodeEndPx > 0) {
					const ux = lineEndX - brainStartX;
					const uy = lineEndY - brainStartY;
					const segLen = Math.sqrt(ux * ux + uy * uy) || 1;
					const pull = Math.min(ungeShortenFromNodeEndPx, segLen * 0.42);
					lineEndX -= (ux / segLen) * pull;
					lineEndY -= (uy / segLen) * pull;
				}
				/* Hele segmentet lidt ned (samme offset i begge ender → samme vinkel) */
				const lineEndYAdj = lineEndY + ungeLinePressDown;
				const brainStartYAdj = brainStartY + ungeLinePressDown;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndYAdj - brainStartYAdj, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndYAdj - brainStartYAdj) ** 2);
				
				console.log('UNGE MOD UV linje 5 details (from center, down to the right):', { brainStartX, brainStartY: brainStartYAdj, lineEndX, lineEndY: lineEndYAdj, angle, lineLength });
				
				// Create image element for the line - use same pattern as KØ-BAJER
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 5.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 5.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', String(brainStartYAdj - lineH(300) / 2));
				lineImage.setAttribute('width', lineLength * mindmapLineLenMul * 1.04);
				lineImage.setAttribute('height', String(lineH(300)));
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartYAdj})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log('✓ UNGE MOD UV linje 5.webp asset line created and added to SVG (down to the right)');
				
				return; // Skip further hand-drawn processing for UNGE MOD UV
			}
			
			// Special case: Use image for BYENS LANDHANDEL (check by data-visual-key/text/href)
			const nodeTextByens = node.textContent.trim();
			const nodeHrefByens = (node.getAttribute('href') || '').toLowerCase();
			const nodeVisualKey = (node.dataset.visualKey || '').toLowerCase();
			if (nodeVisualKey === 'byens-landhandel' || nodeTextByens === 'Byens Landhandel' || nodeHrefByens.includes('byens-landhandel')) {
				console.log('Creating line for BYENS LANDHANDEL', {nodeX, nodeY, centerX, centerY});
				
				// Anchor the line under a specific letter instead of dead-center.
				// "Byens Landhandel": the user wants the line connected under the "e" in "Byens",
				// so we aim a bit left-of-center and slightly lower than the node center.
				const byensAnchorX = nodeRect.left - containerRect.left + nodeRect.width * 0.44;
				const byensAnchorY = nodeRect.top - containerRect.top + nodeRect.height * 0.78;
				
				// Start from below the top of the brain, then extend slightly toward the brain
				const initialBrainStartX = centerX;
				const initialBrainStartY = brainRect.top - containerRect.top + 50; // Below top of brain
				
				// End further toward the tab (extend a bit past the tab center)
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				let nodeExtension = nodeRadius * (desktopProjectsWide ? 0.58 : 0.25);
				const deltaX = byensAnchorX - initialBrainStartX;
				const deltaY = byensAnchorY - initialBrainStartY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				let lineEndX = byensAnchorX + (deltaX / distance) * nodeExtension;
				let lineEndY = byensAnchorY + (deltaY / distance) * nodeExtension;
				
				// Extend backward from the initial start point to make the line longer toward the brain
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				let brainExtension = brainRadius * 0.28;
				let brainStartX = initialBrainStartX - (deltaX / distance) * brainExtension;
				let brainStartY = initialBrainStartY - (deltaY / distance) * brainExtension;
				if (ipadLandscapeLines) {
					nodeExtension = nodeRadius * 0.72;
					brainExtension = brainRadius * 0.05;
				}
				/* Kort mobil-landscape: hjernens ende (peger mod hjernen) lidt ned + til venstre */
				if (mskIsProjectsShortLandscapeViewport()) {
					brainStartX -= 22;
					brainStartY += 24;
				}
				
				// Calculate angle for rotation
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2) * spokeLenMul;
				
				console.log('Line details:', {brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength});
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 1.webp');
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', String(brainStartY - lineH(400) / 2));
				lineImage.setAttribute('width', lineLength * mindmapLineLenMul);
				lineImage.setAttribute('height', String(lineH(400)));
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none'); // Force stretching
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add(
					'mindmap-line',
					'dynamic-mindmap-line',
					'mobile-mindmap-line',
					'byens-brain-line'
				);
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				
				currentSvg.appendChild(lineImage);
				console.log(`Line image created for BYENS LANDHANDEL`);
				return; // Skip the hand-drawn line creation for BYENS LANDHANDEL
			}
			
			// Special case: Use image for REPOP BY DEPOP (check by data-visual-key/text/href)
			const nodeTextRepop = node.textContent.trim();
			const nodeHrefRepop = (node.getAttribute('href') || '').toLowerCase();
			const nodeVisualKeyRepop = (node.dataset.visualKey || '').toLowerCase();
			if (nodeVisualKeyRepop === 'repop' || nodeTextRepop === 'REPOP BY DEPOP' || nodeHrefRepop.includes('repop')) {
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const tabGapDistance = nodeRadius * 0.1;
				const brainRadiusLine = Math.min(brainRect.width, brainRect.height) / 2;

				// Start from below the top of the brain, extended backward toward brain
				const initialBrainStartX = centerX;
				let initialBrainStartY = brainRect.top - containerRect.top + 50;
				let brainExtension = brainRadiusLine * 0.32;
				let repopLineHpx;
				let repopLineLenMul = desktopProjectsWide ? 0.99 : 0.92;

				if (ipadLandscapeLines) {
					repopLineHpx = lineH(332);
					repopLineLenMul = 1;
				} else if (mskIsProjectsShortLandscapeViewport()) {
					repopLineHpx = 200;
				} else if (desktopProjectsWide) {
					repopLineHpx = lineH(400);
				} else {
					repopLineHpx = lineH(52);
				}

				const deltaX = nodeX - initialBrainStartX;
				const deltaY = nodeY - initialBrainStartY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				let lineEndX = nodeX - (deltaX / distance) * tabGapDistance;
				let lineEndY = nodeY - (deltaY / distance) * tabGapDistance;

				let brainStartX = initialBrainStartX - (deltaX / distance) * brainExtension;
				let brainStartY = initialBrainStartY - (deltaY / distance) * brainExtension;
				let repopLineLenScale = repopLineLenMul * mindmapLineLenMul;
				if (ipadLandscapeLines) {
					repopLineLenScale = 1;
					try {
						const ring = currentSvg.querySelector('image.repop-image');
						const pts = mskRepopIpadLandscapeLinePoints(
							containerRect,
							brainRect,
							ring,
							node,
							nodeRect
						);
						lineEndX = pts.lineEndX;
						lineEndY = pts.lineEndY;
						brainStartX = pts.brainStartX;
						brainStartY = pts.brainStartY;
					} catch (_) {}
				}

				// Calculate angle for rotation
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/Linje 2.webp');
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', String(brainStartY - repopLineHpx / 2));
				lineImage.setAttribute(
					'width',
					String(lineLength * repopLineLenScale)
				);
				lineImage.setAttribute('height', String(repopLineHpx));
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none'); // Force stretching
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line', 'repop-brain-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				
				currentSvg.appendChild(lineImage);
				console.log(`Line image created for REPOP BY DEPOP`);
				return; // Skip the hand-drawn line creation for REPOP BY DEPOP
			}
			
			// Special case: NATURLI' - render linje 7.webp asset line from brain center to node
			const nodeTextNaturli = node.textContent.trim();
			const nodeHrefNaturli = node.getAttribute('href') || '';
			if ((nodeHrefNaturli || '').toLowerCase().includes('naturli') || index === 2) {
				console.log(`✓ NATURLI (naturli*) detected at index ${index} - creating linje 7.webp asset line`);
				
				// Start from the center of the brain
				const brainCenterX = centerX;
				const brainCenterY = centerY;
				
				// Calculate end point - extend closer to/past the NATURLI' node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const deltaX = nodeX - brainCenterX;
				const deltaY = nodeY - brainCenterY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Small gap from node
				const tabGapDistance = nodeRadius * 0.1;
				const lineEndX = nodeX - (deltaX / distance) * tabGapDistance;
				const lineEndY = nodeY - (deltaY / distance) * tabGapDistance;
				
				// Add gap from brain center to make line shorter toward brain
				const brainGapDistance = nodeRadius * 0.4; // Gap from brain center
				const brainStartX = brainCenterX + (deltaX / distance) * brainGapDistance;
				const brainStartY = brainCenterY + (deltaY / distance) * brainGapDistance;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				console.log('NATURLI\' linje 7 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 7.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 7.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', String(brainStartY - lineH(200) / 2));
				lineImage.setAttribute('width', lineLength * mindmapLineLenMul);
				lineImage.setAttribute('height', String(lineH(200)));
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log(`✓ NATURLI' linje 7.webp asset line created and added to SVG`);
				return; // Skip the hand-drawn line creation for NATURLI'
			}
			
			// Special case: TWISTER - render linje 3.webp asset line from brain center to node
			const nodeTextTwister = node.textContent.trim();
			const nodeHrefTwister = node.getAttribute('href') || '';
			if (nodeTextTwister === 'TWISTER' || nodeHrefTwister.includes('twister')) {
				console.log(`✓ TWISTER detected at index ${index} - creating Linje 3.webp asset line`);
				
				// Start from outside the brain (add gap from brain center)
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const brainGapDistance = brainRadius * 0.45; // Start closer to brain (longer line)
				const deltaX = nodeX - centerX;
				const deltaY = nodeY - centerY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				const brainStartX = centerX + (deltaX / distance) * brainGapDistance;
				const brainStartY = centerY + (deltaY / distance) * brainGapDistance - 30; // Move line up by 30px
				
				// Calculate end point - extend to/past the TWISTER node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				// Extend past the node center for a longer line (længere ud mod TWISTER-boblen)
				let extensionAmount = nodeRadius * 1.82;
				/* Kort mobil-landscape: hjernen → TWISTER — lidt længere end default (afstemt — ikke for lang) */
				if (mskIsProjectsShortLandscapeViewport()) {
					extensionAmount = nodeRadius * 2.04 + 14;
				}
				const lineEndX = nodeX + (deltaX / distance) * extensionAmount;
				const lineEndY = nodeY + (deltaY / distance) * extensionAmount - 30; // Move line up by 30px
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const twShortLsSpokeBoost = mskIsProjectsShortLandscapeViewport() ? 1.1 : 1;
				const lineLength =
					Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2) *
					spokeLenMul *
					twShortLsSpokeBoost;
				
				console.log('TWISTER Linje 3 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 3.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 3.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', String(brainStartY - lineH(600) / 2));
				lineImage.setAttribute('width', lineLength * mindmapLineLenMul * 1.06);
				lineImage.setAttribute('height', String(lineH(600)));
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line');
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log(`✓ TWISTER linje 3.webp asset line created and added to SVG`);
				return; // Skip the hand-drawn line creation for TWISTER
			}
			
			// BRAINFARTS is already handled earlier with linje 8.webp asset line
			
			// DISABLED: Only use asset images, no hand-drawn paths - but asset images are created above
			return;
			
			// Create curved path with gaps at both ends
			const pathData = `M${startX},${startY} Q${midX + randomOffsetX},${midY + randomOffsetY} ${endX},${endY}`;
			
			// Create multiple overlapping paths with different textures
			const textures = [
				{ filter: 'url(#charcoalTexture)', stroke: '#1a1a1a', width: '5', opacity: '0.4' },
				{ filter: 'url(#roughEdges)', stroke: '#2a2a2a', width: '3.5', opacity: '0.3' },
				{ filter: 'url(#grainyTexture)', stroke: '#333', width: '2.5', opacity: '0.25' },
				{ filter: 'none', stroke: '#1a1a1a', width: '4', opacity: '0.35' }
			];
			
			textures.forEach((texture, i) => {
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				
				// Add slight variations to each path for more organic look
				const variationX = (Math.random() - 0.5) * 8;
				const variationY = (Math.random() - 0.5) * 8;
				const variedPathData = `M${startX + variationX},${startY + variationY} Q${midX + randomOffsetX + variationX},${midY + randomOffsetY + variationY} ${endX + variationX},${endY + variationY}`;
				
				path.setAttribute('d', variedPathData);
				path.setAttribute('stroke', texture.stroke);
				path.setAttribute('stroke-width', texture.width);
				path.setAttribute('opacity', texture.opacity);
				path.setAttribute('fill', 'none');
				path.setAttribute('stroke-linecap', 'round');
				path.setAttribute('stroke-linejoin', 'round');
				path.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line');
			path.dataset.nodeIndex = String(index);
			path.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				
				if (texture.filter !== 'none') {
					path.setAttribute('filter', texture.filter);
				}
				
				currentSvg.appendChild(path);
			});
			
			// Add additional rough texture layers
			for (let j = 0; j < 2; j++) {
				const roughPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				const roughVariationX = (Math.random() - 0.5) * 15;
				const roughVariationY = (Math.random() - 0.5) * 15;
				const roughPathData = `M${startX + roughVariationX},${startY + roughVariationY} Q${midX + randomOffsetX + roughVariationX},${midY + randomOffsetY + roughVariationY} ${endX + roughVariationX},${endY + roughVariationY}`;
				
				roughPath.setAttribute('d', roughPathData);
				roughPath.setAttribute('stroke', j === 0 ? '#444' : '#555');
				roughPath.setAttribute('stroke-width', j === 0 ? '1.5' : '1');
				roughPath.setAttribute('opacity', j === 0 ? '0.2' : '0.15');
				roughPath.setAttribute('fill', 'none');
				roughPath.setAttribute('stroke-linecap', 'round');
				roughPath.setAttribute('stroke-linejoin', 'round');
				roughPath.setAttribute('filter', 'url(#roughEdges)');
				roughPath.classList.add('mindmap-line', 'dynamic-mindmap-line', 'mobile-mindmap-line');
			roughPath.dataset.nodeIndex = String(index);
			roughPath.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				
				currentSvg.appendChild(roughPath);
			}
			
			console.log(`Hand-drawn line ${index} created to (${nodeX}, ${nodeY})`);
		});
		
		console.log('All hand-drawn lines created. SVG children:', currentSvg.children.length);
	}

	// Create hand-drawn circles around project tabs
	function createHandDrawnFrames(options) {
		const forceRedraw = !!(options && options.force);
		console.log('Creating hand-drawn circles...');
		
		const currentSvg = document.querySelector('.connecting-lines');
		const currentNodes = document.querySelectorAll('.project-node');
		const container = document.querySelector('.brainstorm-container');
		
		if (!currentSvg || !currentNodes.length || !container) {
			console.error('Missing elements for frame creation:', {currentSvg, currentNodes: currentNodes.length, container});
			return;
		}

		if (!forceRedraw && currentSvg.dataset.mskDynamicGraphicsBuilt === '1') {
			if (
				mskShouldUsePortraitHtmlRings() &&
				container.querySelectorAll('.msk-portrait-ring-overlay.hand-drawn-frame').length >=
					currentNodes.length
			) {
				return;
			}
			if (!mskShouldUsePortraitHtmlRings() && !mskProjectsMindmapNeedsGraphicRebuild()) return;
		}

		if (mskShouldUsePortraitHtmlRings()) {
			mskProjectsSyncLayoutBeforePaint();
			mskCreatePortraitGridRingOverlays();
			return;
		}

		try {
			container.querySelectorAll('.msk-portrait-ring-overlay').forEach((el) => {
				try {
					el.remove();
				} catch (_) {}
			});
		} catch (_) {}

		// Remove existing circles to avoid duplicates when this function runs again (e.g., on resize)
		const existingCircles = currentSvg.querySelectorAll('.hand-drawn-frame, [class*="hand-drawn"], .brainfarts-overlay, .brainfarts-ipad-construction-sign, image[href*="cirkel"], image[href*="circle"], image[xlink\\:href*="cirkel"], image[xlink\\:href*="circle"], image[href*="brainfarts"], image[href*="repop"], image[href*="kobajer"], image[href*="naturli"], image[href*="twister"], image[href*="durex"], image[href*="unge"], image[href*="ombygning"]');
		existingCircles.forEach(el => {
			// Only remove if it's a circle/frame element, not a line
			const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
			if (
				el.classList.contains('hand-drawn-frame') ||
				el.classList.contains('brainfarts-overlay') ||
				el.classList.contains('brainfarts-ipad-construction-sign') ||
				el.classList.contains('brainfarts-ipad-construction-wrap') ||
				href.includes('cirkel') ||
				href.includes('circle') ||
				href.includes('brainfarts') ||
				href.includes('ombygning') ||
				href.includes('repop') ||
				href.includes('kobajer') ||
				href.includes('naturli') ||
				href.includes('twister') ||
				href.includes('durex') ||
				href.includes('unge')
			) {
				el.remove();
			}
		});
		
		const containerRect = container.getBoundingClientRect();
		console.log('Container rect:', containerRect);
		mskProjectsSyncLayoutBeforePaint();
		const scale = 1;
		const s = (n) => n * scale;
		/* Kort landscape: mindre håndtegnede cirkler (SVG) så de matcher mindre titelbilleder */
		let assetS = 1;
		try {
			if (mskIsProjectsShortLandscapeViewport()) assetS = 0.76;
		} catch (_) {
			assetS = 1;
		}
		let portraitGridRingsEarly = false;
		try {
			portraitGridRingsEarly = mskIsProjectsPortraitGridRingsMode();
		} catch (_) {}
		function isProjectsPhoneLandscape() {
			try {
				const { w, h } = mskViewportSize();
				return w <= 640 && h < w;
			} catch (_) {
				return false;
			}
		}
		const landscapeMindmap =
			isProjectsPhoneLandscape() || mskIsProjectsShortLandscapeViewport();
		/** Projects på smal skærm (≤640px): Twister/Kø-Bajer lodrette ring-juster — portrait og phone landscape */
		function isProjectsPhoneWidth() {
			try {
				const iw = mskViewportSize().w || 0;
				if (!document.body || !document.body.classList.contains('projects-page')) return false;
				return iw <= 640;
			} catch (_) {
				return false;
			}
		}

		/** Desktop mindmap (matcher CSS min-width: 1025px): lidt større håndtegnede ringe — mobil uændret */
		function getProjectsDesktopRingMul() {
			try {
				const w = mskViewportSize().w || mskProjectsLayoutViewportBox().w || 0;
				if (w < 1025) return 1;
				if (mskIsProjectsShortLandscapeViewport()) return 1;
				if (mskIsProjectsTabletLandscapeViewport()) return 1.16;
				return 1.14;
			} catch (_) {
				return 1;
			}
		}
		const projectsDesktopRingMul = getProjectsDesktopRingMul();

		/** Portræt-grid (telefon + iPad): samme håndtegnede ringe — telefon skaleres med layoutW/768 */
		let portraitGridRings = false;
		let portraitRingScale = 1;
		try {
			portraitGridRings = mskIsProjectsPortraitGridRingsMode();
			if (portraitGridRings) portraitRingScale = mskProjectsPortraitReferenceScale();
		} catch (_) {}
		const ipadPortraitRings =
			portraitGridRings &&
			!mskIsProjectsPhonePortraitViewport() &&
			!document.documentElement.classList.contains('msk-projects-phone-portrait') &&
			(mskIsProjectsTabletPortraitViewport() ||
				document.documentElement.classList.contains('msk-projects-ipad-portrait'));
		const phonePortraitRings =
			portraitGridRings &&
			(mskIsProjectsPhonePortraitViewport() ||
				document.documentElement.classList.contains('msk-projects-phone-portrait'));
		const phoneRingMul = phonePortraitRings ? Math.max(0.72, portraitRingScale) : 1;
		function shrinkPhoneRing(w, h) {
			if (!phonePortraitRings || phoneRingMul >= 0.999) return [w, h];
			return [w * phoneRingMul, h * phoneRingMul];
		}

		/** iPad 1024–1366 landskab + ellipse-mindmap: større håndtegnede ringe om titlerne — kun her */
		let ipadLandscapeRings = false;
		try {
			ipadLandscapeRings =
				!!mskIsProjectsTabletLandscapeViewport() &&
				!container.classList.contains('projects-mindmap--portrait');
		} catch (_) {}

		/** iPad landskab: fladere ovaler (mindre højde, samme bredde ca.) */
		const ipadLsRingVertMul = ipadLandscapeRings ? 0.78 : 1;
		const pRing = portraitGridRings ? portraitRingScale : 1;
		const prs = (n) => n * pRing;

		currentNodes.forEach((node, index) => {
			// Used to map hover -> matching frame element
			node.dataset.nodeIndex = String(index);
			const nodeHref = (node.getAttribute('href') || '').toLowerCase();
			node.dataset.nodeHref = nodeHref;
			const targetHref = (node.getAttribute('href') || '').trim();

			function wireFrameNavigation(el) {
				try {
					if (!el || !targetHref) return;
					/* Brainfarts: samme som <a> — visuelt klikbar ring, men ingen navigation (under ombygning) */
					if (nodeHref.includes('brainfarts')) {
						el.style.pointerEvents = 'auto';
						el.style.cursor = 'not-allowed';
						el.addEventListener(
							'click',
							(e) => {
								if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
								try {
									e.preventDefault();
								} catch {}
								try {
									e.stopPropagation();
								} catch {}
							},
							true
						);
						return;
					}
					el.style.pointerEvents = 'auto';
					el.style.cursor = 'pointer';
					el.addEventListener(
						'click',
						(e) => {
							try {
								e.preventDefault();
							} catch {}
							try {
								e.stopPropagation();
							} catch {}
							try {
								e.stopImmediatePropagation();
							} catch {}
							window.location.href = targetHref;
						},
						true
					);
				} catch {}
			}

			const nodeRect = node.getBoundingClientRect();
			const nodeText = node.textContent.trim();

			const titleEl = node.querySelector('.project-node__title');
			const anchorCenterSvg = mskProjectsMindmapNodeCenterSvg(
				node,
				currentSvg,
				container,
				containerRect
			);
			const centerX = anchorCenterSvg.x;
			const centerY = anchorCenterSvg.y;

			console.log(`Processing node ${index}: "${nodeText}" at (${centerX}, ${centerY})`);
			
			// Special case: BRAINFARTS uses the image instead of hand-drawn circle
			// (Titles are often image-only; match href so we always use your asset.)
			if (nodeText === 'BRAINFARTS' || nodeHref.includes('brainfarts')) {
				console.log('Creating BRAINFARTS circle image...');
				const bfShortLs = mskIsProjectsShortLandscapeViewport();
				const brainfartsRingScale = 0.78 * (bfShortLs ? 1.09 : 1);
				/* Kort mobil-landscape: bredere oval (kun vandret — bh / ry uændret) */
				const bfShortLsStretchX = bfShortLs ? 1.24 : 1;
				/* iPad portræt mindmap: ekstra vandret på ring + fill; rød linje sit eget step så den ikke vokser med.
				 * preserveAspectRatio none på <image> — ellers default "meet" bevarer billedformat og æter ikke bw/bh uafhængigt. */
				const bfIpadMulWRing = ipadPortraitRings ? 3.02 * pRing : ipadLandscapeRings ? 1.92 : 1;
				const bfIpadMulWLine = ipadPortraitRings ? 1.9 * pRing : ipadLandscapeRings ? 1.38 : 1;
				const bfIpadMulH = ipadPortraitRings ? 1.8 * pRing : ipadLandscapeRings ? 0.9 : 1;
				// Create an image element for BRAINFARTS
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/cirkel om brainfarts.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				let bw =
					240 * brainfartsRingScale * projectsDesktopRingMul * bfShortLsStretchX * bfIpadMulWRing;
				let bh = 200 * brainfartsRingScale * projectsDesktopRingMul * bfIpadMulH;
				if (ipadLandscapeRings) bh *= ipadLsRingVertMul;
				[bw, bh] = shrinkPhoneRing(bw, bh);
				const bfDrawCy = centerY + (ipadLandscapeRings ? -s(2) : 0);
				image.setAttribute('x', String(centerX - bw / 2));
				image.setAttribute('y', String(bfDrawCy - bh / 2));
				image.setAttribute('width', String(bw));
				image.setAttribute('height', String(bh));
				image.setAttribute('preserveAspectRatio', 'none');
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.style.pointerEvents = 'auto'; // Make image visible
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'brainfarts-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				console.log('Creating BRAINFARTS circle image at:', centerX, centerY, 'with path:', imagePath);
				
				// No hover effect for BRAINFARTS - it should stay still when hovering

				// Purple fill behind the circle (hover)
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				// Make it shorter on the RIGHT side only (keep left side roughly the same)
				// Achieved by shifting left and reducing rx by the same amount.
				fill.setAttribute('cx', String(centerX - 1)); // BRAINFARTS: slightly bigger on the left (right edge unchanged)
				// Slightly smaller at the bottom: shift up a bit
				fill.setAttribute('cy', String(bfDrawCy - 3)); // BRAINFARTS: slightly smaller at the top (bottom unchanged)
				fill.setAttribute(
					'rx',
					String(
						(120 * 0.56 + 2) *
							brainfartsRingScale *
							projectsDesktopRingMul *
							bfShortLsStretchX *
							bfIpadMulWRing
					)
				);
				fill.setAttribute(
					'ry',
					String((100 * 0.56 - 1) * brainfartsRingScale * projectsDesktopRingMul * bfIpadMulH)
				);
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);
				
				currentSvg.appendChild(image);

				// "Under construction" red line through the circle (use provided asset)
				try {
					const lineImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
					const linePath = 'assets/rød linje.webp';
					lineImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', linePath);
					lineImg.setAttribute('href', linePath);
					lineImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', linePath);

					// Keep it smaller and within the circle-ish area (circle image is 240x200, scaled by brainfartsRingScale)
					const w =
						205 * brainfartsRingScale * projectsDesktopRingMul * bfShortLsStretchX * bfIpadMulWLine;
					const h = 160 * brainfartsRingScale * projectsDesktopRingMul * bfIpadMulH;
					lineImg.setAttribute('width', String(w));
					lineImg.setAttribute('height', String(h));
					// Place it so it goes from RIGHT side -> down to BOTTOM-LEFT
					lineImg.setAttribute('x', String(centerX - (w / 2) - 5 * brainfartsRingScale));
					lineImg.setAttribute('y', String(bfDrawCy - (h / 2) + 4 * brainfartsRingScale));
					lineImg.setAttribute('preserveAspectRatio', 'none');
					// Slightly see-through so it reads like drawn on paper
					lineImg.setAttribute('opacity', ipadLandscapeRings ? '0.9' : '0.78');
					// Diagonal "/" feel (top-right -> bottom-left)
					lineImg.setAttribute('transform', `rotate(-36 ${centerX} ${bfDrawCy})`);

					lineImg.style.pointerEvents = 'none';
					lineImg.style.display = 'block';
					lineImg.style.visibility = 'visible';
					lineImg.classList.add('brainfarts-overlay', 'brainfarts-construction-line');
					lineImg.dataset.nodeIndex = String(index);
					lineImg.dataset.nodeHref = nodeHref;
					currentSvg.appendChild(lineImg);
				} catch {}

				/* iPad landskab: én “Under ombygning” i SVG — smal (meet), ca. cirkelhøjde, gennemsigtig */
				if (ipadLandscapeRings) {
					try {
						const signPath = `assets/${encodeURIComponent('Under ombygning.webp')}`;
						const signWrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
						signWrap.setAttribute('class', 'brainfarts-ipad-construction-wrap');
						signWrap.setAttribute('opacity', String(MSK_BRAINFARTS_IPAD_SIGN_OPACITY));
						const signImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
						signImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', signPath);
						signImg.setAttribute('href', signPath);
						signImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', signPath);
						const signBoxH = bh * 0.86;
						const signBoxW = bw * 0.56;
						signImg.setAttribute('width', String(signBoxW));
						signImg.setAttribute('height', String(signBoxH));
						signImg.setAttribute('x', String(centerX - signBoxW / 2));
						signImg.setAttribute('y', String(bfDrawCy - signBoxH / 2 + s(4)));
						signImg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
						signImg.setAttribute('opacity', String(MSK_BRAINFARTS_IPAD_SIGN_OPACITY));
						signImg.style.pointerEvents = 'none';
						signImg.style.display = 'block';
						signImg.style.visibility = 'visible';
						signImg.classList.add('brainfarts-ipad-construction-sign', 'brainfarts-overlay');
						signImg.dataset.nodeIndex = String(index);
						signImg.dataset.nodeHref = nodeHref;
						signWrap.appendChild(signImg);
						currentSvg.appendChild(signWrap);
					} catch (_) {}
				}

				console.log(`✓ BRAINFARTS circle image appended to SVG. SVG children count:`, currentSvg.children.length);
				wireFrameNavigation(image);
				return; // Skip the hand-drawn circle creation for BRAINFARTS
			}
			
			// Special case: REPOP BY DEPOP uses the image instead of hand-drawn circle
			if (nodeText === 'REPOP BY DEPOP' || nodeHref.includes('repop')) {
				console.log('Creating REPOP BY DEPOP circle image...');
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/circle around repop by depop.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				const repTitleEl = node.querySelector('.project-node__title');
				const repBadgeEl = node.querySelector('.kravling-nomineret-badge--inline');
				const repTitleRect = repTitleEl ? repTitleEl.getBoundingClientRect() : nodeRect;
				const repBadgeRect = repBadgeEl ? repBadgeEl.getBoundingClientRect() : null;
				let unionW = nodeRect.width;
				let unionH = nodeRect.height;
				let repCenterX = centerX;
				let repCenterY = centerY;
				try {
					if (repBadgeRect) {
						const left = Math.min(repTitleRect.left, repBadgeRect.left);
						const right = Math.max(repTitleRect.right, repBadgeRect.right);
						const top = Math.min(repTitleRect.top, repBadgeRect.top);
						const bottom = Math.max(repTitleRect.bottom, repBadgeRect.bottom);
						unionW = Math.max(1, right - left);
						unionH = Math.max(1, bottom - top);
						const unionCenter = svgCenterFromRect(
							currentSvg,
							{ left, top, width: unionW, height: unionH },
							containerRect
						);
						repCenterX = unionCenter.x;
						repCenterY = unionCenter.y;
					}
				} catch {}
				if (ipadLandscapeRings) {
					repCenterY -= s(4);
				}

				let repopMul = 0.88;
				try {
					if (phonePortraitRings) repopMul = 0.8;
					else if (window.matchMedia && window.matchMedia('(orientation: portrait)').matches) {
						repopMul = 0.82;
						if (window.matchMedia('(max-width: 640px)').matches) repopMul = 0.93;
					}
					if (ipadPortraitRings) repopMul = Math.max(repopMul, 0.96);
					if (ipadLandscapeRings) repopMul = 0.96;
				} catch {}

				const baseW = s(380) * assetS;
				const baseH = s(landscapeMindmap ? 218 : 165) * assetS;
				let padXPx = landscapeMindmap ? 48 : 40;
				let padYPortrait = repBadgeRect ? 58 : 46;
				try {
					if (phonePortraitRings) {
						padXPx = 28;
						padYPortrait = repBadgeRect ? 36 : 28;
					} else if (window.matchMedia && window.matchMedia('(max-width: 640px) and (orientation: portrait)').matches) {
						padXPx = Math.max(padXPx, 64);
						padYPortrait = repBadgeRect ? 92 : 72;
					}
					if (ipadPortraitRings) {
						padXPx = Math.max(padXPx, 80);
						padYPortrait = repBadgeRect ? Math.max(padYPortrait, 100) : Math.max(padYPortrait, 82);
					}
					if (ipadLandscapeRings) {
						padXPx = Math.max(padXPx, 72);
						padYPortrait = repBadgeRect ? 42 : 34;
					}
				} catch {}
				const padX = s(padXPx) * assetS;
				const padY =
					s(
						ipadLandscapeRings
							? padYPortrait
							: landscapeMindmap
								? 96
								: padYPortrait
					) * assetS;
				let w = Math.max(baseW, unionW + padX);
				let h = Math.max(baseH, unionH + padY);
				/* Kort mobil-landskab (fx iPhone XR 896×414): landscapeMindmap er true selv om w>640 — isProjectsPhoneLandscape() var false → ingen skalering */
				let repopLsMulW = 1;
				let repopLsMulH = 1;
				try {
					if (ipadLandscapeRings) {
						repopLsMulW = 1.1;
						repopLsMulH = 0.76;
					} else if (
						landscapeMindmap &&
						window.matchMedia &&
						window.matchMedia('(orientation: landscape)').matches
					) {
						/* Kun bredere (ovalere) i kort mobil-landskab — ikke højere */
						repopLsMulW = 1.22;
						repopLsMulH = 1.14;
					}
				} catch {}
				w *= repopMul * repopLsMulW;
				h *= repopMul * repopLsMulH;
				w *= projectsDesktopRingMul;
				h *= projectsDesktopRingMul;
				/* Lidt bredere horizontalt (oval) — kun stretch på X, som NATURLI */
				let repopStretchX = phonePortraitRings ? 1.04 : 1.12;
				if (ipadPortraitRings) repopStretchX = 1.92 * pRing;
				else if (ipadLandscapeRings) repopStretchX = 1.28;
				w *= repopStretchX;
				if (ipadLandscapeRings) {
					w *= 1.04;
					h *= ipadLsRingVertMul * 0.74;
				}
				[w, h] = shrinkPhoneRing(w, h);

				image.setAttribute('x', String(repCenterX - (w / 2) - s(-3)));
				image.setAttribute('y', String(repCenterY - (h / 2)));
				image.setAttribute('width', String(w));
				image.setAttribute('height', String(h));
				image.setAttribute('preserveAspectRatio', 'none');
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('transform', `rotate(180 ${repCenterX} ${repCenterY})`);
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'repop-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				wireFrameNavigation(image);

				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(repCenterX - s(1)));
				fill.setAttribute('cy', String(repCenterY - s(2)));
				fill.setAttribute(
					'rx',
					String(
						((s(190) * 0.55 - s(7)) * assetS) *
							repopMul *
							repopLsMulW *
							projectsDesktopRingMul *
							repopStretchX
					)
				);
				fill.setAttribute('ry', String(((h / 2) * 0.68 - s(2)) * assetS));
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ REPOP BY DEPOP circle image appended to SVG`);
				return;
			}
			
			// Special case: KØ-BAJER uses the image instead of hand-drawn circle
			if (nodeText === 'KØ-BAJER' || nodeHref.includes('kobajer')) {
				console.log('Creating KØ-BAJER circle image...');
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/cirkel købajer.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				const kTitleEl = node.querySelector('.project-node__title');
				const kBadgeEl = node.querySelector('.kobajer-kravling-2024-badge--inline');
				const kTitleRect = kTitleEl ? kTitleEl.getBoundingClientRect() : nodeRect;
				const kBadgeRect = kBadgeEl ? kBadgeEl.getBoundingClientRect() : null;
				let unionW = nodeRect.width;
				let unionH = nodeRect.height;
				let kCenterX = centerX;
				let kCenterY = centerY;
				try {
					if (kBadgeRect) {
						const left = Math.min(kTitleRect.left, kBadgeRect.left);
						const right = Math.max(kTitleRect.right, kBadgeRect.right);
						const top = Math.min(kTitleRect.top, kBadgeRect.top);
						const bottom = Math.max(kTitleRect.bottom, kBadgeRect.bottom);
						unionW = Math.max(1, right - left);
						unionH = Math.max(1, bottom - top);
						const unionCenter = svgCenterFromRect(
							currentSvg,
							{ left, top, width: unionW, height: unionH },
							containerRect
						);
						kCenterX = unionCenter.x;
						kCenterY = unionCenter.y;
					}
				} catch {}

				const baseW = s(232) * assetS;
				const baseH = s(landscapeMindmap ? 292 : 232) * assetS;
				const padX = s(landscapeMindmap ? 92 : 80) * assetS;
				const padYPortrait = kBadgeRect ? 58 : 44;
				const padY = s(landscapeMindmap ? 124 : padYPortrait) * assetS;
				let w = Math.max(baseW, unionW + padX);
				let h = Math.max(baseH, unionH + padY);
				const kobajerRingScale = 0.78;
				const kobajerRingVertMul = isProjectsPhoneWidth()
					? (landscapeMindmap ? 0.84 : 0.74)
					: (landscapeMindmap ? 0.94 : 1);
				w *= kobajerRingScale;
				h *= kobajerRingScale * kobajerRingVertMul;
				/*
				 * Større ring i mobil/tablet landscape. Kun mskIsProjectsShortLandscapeViewport() rammer
				 * ikke hvis clientHeight > 520 (DevTools, Safari-chrome) — så brug layout-boks: bred > høj, w≤1024.
				 */
				let kobajerLandscapeBump = false;
				let kobajerPortraitPhoneBump = false;
				try {
					const { w: lw, h: lh } = mskProjectsLayoutViewportBox();
					kobajerLandscapeBump = lh < lw && lw <= MSK_PROJECTS_LANDSCAPE_MAX_W && lw >= 280;
					kobajerPortraitPhoneBump = lh >= lw && lw <= 640 && lw >= 280;
				} catch (_) {}
				if (kobajerLandscapeBump) {
					if (mskIsProjectsShortLandscapeViewport()) {
						w *= 1.44;
						h *= 1.14;
					} else {
						w *= 1.34;
						h *= 1.1;
					}
				} else if (kobajerPortraitPhoneBump && isProjectsPhoneWidth()) {
					w *= 1.22;
					h *= 1.16;
				}
				/* Portræt mindmap: bredere ring vandret (højde uændret) */
				try {
					if (ipadPortraitRings) {
						w *= 1 + (2.02 - 1) * pRing;
						h *= 1 + (1.48 - 1) * pRing;
					}
					if (ipadLandscapeRings) {
						w *= 1.58;
						h *= 0.92;
					}
				} catch (_) {}
				w *= projectsDesktopRingMul;
				h *= projectsDesktopRingMul;
				if (ipadLandscapeRings) h *= ipadLsRingVertMul;
				[w, h] = shrinkPhoneRing(w, h);
				/* Telefon: ring følger union (titel+Kravling); lidt under centrum; noden uændret → hjernen→Kø-Bajer-linje uændret */
				const drawCy = isProjectsPhoneWidth() ? kCenterY + s(4) : kCenterY;
				let drawCx = kCenterX;
				if (ipadLandscapeRings) drawCx -= s(14);
				image.setAttribute('x', String(drawCx - (w / 2)));
				image.setAttribute('y', String(drawCy - (h / 2) + s(10)));
				image.setAttribute('width', String(w));
				image.setAttribute('height', String(h));
				image.setAttribute('preserveAspectRatio', 'none');
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('transform', `rotate(180 ${drawCx} ${drawCy})`);
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'kobajer-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				wireFrameNavigation(image);

				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(drawCx));
				fill.setAttribute('cy', String(drawCy - s(1)));
				{
					const shortLs = mskIsProjectsShortLandscapeViewport();
					const rxMul = shortLs ? 0.59 : 0.56;
					/* Kort LS: højere cirkel → lidt større lodret fyld */
					const ryMul = shortLs ? 0.58 : 0.6;
					fill.setAttribute('rx', String(((w / 2) * rxMul) * assetS));
					fill.setAttribute('ry', String(((h / 2) * ryMul) * assetS));
				}
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ KØ-BAJER circle image appended to SVG`);
				return;
			}
			
			// Special case: NATURLI' uses the image instead of hand-drawn circle
			if (nodeHref.includes('naturli')) {
				console.log('Creating NATURLI (naturli*) circle image...');
				let naturliMul = 0.93;
				let portraitNaturli = false;
				try {
					const ih = mskViewportSize().h || 0;
					const iw = mskViewportSize().w || 1;
					const ctr = container && container.classList ? container : null;
					portraitNaturli =
						(ctr && ctr.classList.contains('projects-mindmap--portrait')) ||
						(window.matchMedia && window.matchMedia('(max-width: 640px)').matches && ih >= iw);
					/* Lille tekst-webp i CSS — ring større så der er luft omkring label */
					if (portraitNaturli) naturliMul = 0.88;
					if (ipadPortraitRings) naturliMul = Math.max(naturliMul, 0.98);
				} catch {}
				try {
					if (mskIsProjectsShortLandscapeViewport()) naturliMul *= 1.09;
				} catch {}
				/* Kun desktop (min-width 1025): lidt mindre ring så den matcher mindre tekst-webp i CSS — ikke tablet/mobil */
				try {
					const iwDesk = mskViewportSize().w || 0;
					if (
						iwDesk >= 1025 &&
						!portraitNaturli &&
						!mskIsProjectsShortLandscapeViewport() &&
						!ipadLandscapeRings
					) {
						naturliMul *= 0.85;
					}
					if (ipadLandscapeRings) naturliMul = Math.max(naturliMul, 1.04);
				} catch {}
				/* Bredere horizontalt (apostrof + tekst inde i ringen) — kun stretch på X (nH uden stretch) */
				let naturliStretchX = 1.22;
				try {
					if (mskIsProjectsShortLandscapeViewport()) naturliStretchX = 1.34;
					else if (portraitNaturli) naturliStretchX = 1.48;
					if (ipadPortraitRings) naturliStretchX = Math.max(naturliStretchX, 3.5 * pRing);
					else if (ipadLandscapeRings) naturliStretchX = Math.max(naturliStretchX, 1.74);
				} catch {}
				/* Desktop: bredere oval (kun X) — ikke tablet/mobil */
				try {
					const iwWide = mskViewportSize().w || 0;
					if (
						iwWide >= 1025 &&
						!portraitNaturli &&
						!mskIsProjectsShortLandscapeViewport() &&
						!ipadLandscapeRings
					) {
						naturliStretchX *= 1.28;
					}
				} catch {}
				const naturliLsMulH = ipadLandscapeRings ? 0.86 : 1;
				const naturliLsMulW = ipadLandscapeRings ? 1.16 : 1;
				const nW =
					240 * naturliMul * projectsDesktopRingMul * naturliStretchX * naturliLsMulW;
				let nH = 140 * naturliMul * projectsDesktopRingMul * naturliLsMulH;
				if (ipadLandscapeRings) nH *= ipadLsRingVertMul;
				let [nWf, nHf] = shrinkPhoneRing(nW, nH);
				// Create an image element for NATURLI'
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/cirkel omkring naturli'.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', centerX - nWf / 2);
				image.setAttribute('y', centerY - nHf * (65 / 140));
				image.setAttribute('width', String(nWf));
				image.setAttribute('height', String(nHf));
				image.setAttribute('preserveAspectRatio', 'none'); // Prevent aspect ratio from scaling width
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('transform', `rotate(180 ${centerX} ${centerY})`);
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'naturli-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				// NATURLI': make the RIGHT side slightly smaller (keep left edge the same)
				fill.setAttribute('cx', String(centerX + 1));
				fill.setAttribute('cy', String(centerY - 1));
				fill.setAttribute(
					'rx',
					String(
						(120 * 0.5 - 2) *
							naturliMul *
							projectsDesktopRingMul *
							naturliStretchX *
							naturliLsMulW
					)
				);
				fill.setAttribute('ry', String(70 * 0.66 * naturliMul * projectsDesktopRingMul));
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				wireFrameNavigation(image);
				console.log(`✓ NATURLI' circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for NATURLI'
			}
			
			// Special case: UNGE MOD UV uses the image instead of hand-drawn circle
			if (nodeText === 'UNGE MOD UV' || nodeHref.includes('unge-mod-uv')) {
				console.log('Creating UNGE MOD UV circle image...');
				// Create an image element for UNGE MOD UV
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/unge mod uv cirkel.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				let ungeMul = 1;
				try {
					const ih = mskViewportSize().h || 0;
					const iw = mskViewportSize().w || 1;
					const ctr = container && container.classList ? container : null;
					const portrait =
						(ctr && ctr.classList.contains('projects-mindmap--portrait')) ||
						(window.matchMedia && window.matchMedia('(max-width: 640px)').matches && ih >= iw);
					if (phonePortraitRings) ungeMul = 0.82;
					else if (portrait) ungeMul = 0.84;
					if (ipadPortraitRings) ungeMul = Math.max(ungeMul, 0.94);
					if (ipadLandscapeRings) ungeMul = Math.max(ungeMul, 1.06);
				} catch {}
				let ungeStretchX = 1;
				if (ipadPortraitRings) ungeStretchX = 1.82 * pRing;
				else if (ipadLandscapeRings) ungeStretchX = 1.38;
				const ungeLsMulH = ipadLandscapeRings ? 0.86 : 1;
				let uw = 320 * ungeMul * projectsDesktopRingMul * ungeStretchX;
				let uh = 150 * ungeMul * projectsDesktopRingMul * ungeLsMulH;
				if (ipadLandscapeRings) uh *= ipadLsRingVertMul;
				[uw, uh] = shrinkPhoneRing(uw, uh);
				image.setAttribute('x', centerX - uw / 2);
				image.setAttribute('y', centerY - uh / 2);
				image.setAttribute('width', String(uw));
				image.setAttribute('height', String(uh));
				image.setAttribute('preserveAspectRatio', 'none'); // Allow independent width/height scaling
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'unge-mod-uv-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX));
				fill.setAttribute('cy', String(centerY)); // UNGE MOD UV: keep centered
				fill.setAttribute('rx', String(160 * ungeMul * 0.54 * projectsDesktopRingMul * ungeStretchX)); // UNGE MOD UV: wider left+right
				fill.setAttribute('ry', String(75 * ungeMul * 0.51 * projectsDesktopRingMul));  // UNGE MOD UV: slightly more top+bottom
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				wireFrameNavigation(image);
				console.log(`✓ UNGE MOD UV circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for UNGE MOD UV
			}
			
			// Special case: TWISTER uses the image instead of hand-drawn circle
			if (nodeText === 'TWISTER' || nodeHref.includes('twister')) {
				console.log('Creating TWISTER circle image...');
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/cirkel omkring twister.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				const isMobile = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
				const twTitleEl = node.querySelector('.project-node__title');
				const twBadgeEl = node.querySelector('.dandd-badge--inline');
				const twTitleRect = twTitleEl ? twTitleEl.getBoundingClientRect() : nodeRect;
				const twBadgeRect = twBadgeEl ? twBadgeEl.getBoundingClientRect() : null;
				let unionW = nodeRect.width;
				let unionH = nodeRect.height;
				let twCenterX = centerX;
				let twCenterY = centerY;
				try {
					if (twBadgeRect) {
						const left = Math.min(twTitleRect.left, twBadgeRect.left);
						const right = Math.max(twTitleRect.right, twBadgeRect.right);
						const top = Math.min(twTitleRect.top, twBadgeRect.top);
						const bottom = Math.max(twTitleRect.bottom, twBadgeRect.bottom);
						unionW = Math.max(1, right - left);
						unionH = Math.max(1, bottom - top);
						const unionCenter = svgCenterFromRect(
							currentSvg,
							{ left, top, width: unionW, height: unionH },
							containerRect
						);
						twCenterX = unionCenter.x;
						twCenterY = unionCenter.y;
					}
				} catch {}
				const baseW = s(isMobile ? 380 : landscapeMindmap ? 360 : 280) * assetS;
				const baseH = s(
					isMobile ? (landscapeMindmap ? 192 : 170) : landscapeMindmap ? 188 : 120
				) * assetS;
				const padX = s(isMobile ? (landscapeMindmap ? 188 : 170) : landscapeMindmap ? 132 : 90) * assetS;
				const padY = s(isMobile ? (landscapeMindmap ? 108 : 90) : landscapeMindmap ? 108 : 44) * assetS;
				let w = Math.max(baseW, unionW + padX);
				let h = Math.max(baseH, unionH + padY);
				const twisterRingScale = 0.88;
				/* Portræt mobil: lidt højere oval (0.66 → 0.74); landscape uændret */
				const twisterRingVertMul = isProjectsPhoneWidth()
					? (landscapeMindmap ? 0.76 : 0.74)
					: (landscapeMindmap ? 0.92 : 1);
				w *= twisterRingScale;
				h *= twisterRingScale * twisterRingVertMul;
				/* Kort mobil landscape: større Twister-ring (tidligere 0.86 skalerede ned) */
				if (mskIsProjectsShortLandscapeViewport()) {
					w *= 1.12;
					h *= 1.1;
				}
				w *= projectsDesktopRingMul;
				h *= projectsDesktopRingMul;
				if (ipadPortraitRings) {
					w *= 1 + (1.84 - 1) * pRing;
					h *= 1 + (1.52 - 1) * pRing;
				}
				let twisterLsMulW = 1;
				if (ipadLandscapeRings) {
					twisterLsMulW = 1.12;
					w *= 1.34 * twisterLsMulW;
					h *= 0.9;
				}
				if (ipadLandscapeRings) h *= ipadLsRingVertMul;
				/* Kun ring + fill (ikke tekst): skub ned; desktop har eget offset når landscapeMindmap er false */
				let circleDy = landscapeMindmap ? s(48) : s(20);
				/* iPad landskab: ring lidt op + bredere (X); TWISTER-tekst styres i CSS */
				if (ipadLandscapeRings) {
					circleDy = s(2);
				}
				/* Kort mobil-landscape: kun ringen op (noden uændret) — mindre circleDy */
				if (mskIsProjectsShortLandscapeViewport()) {
					circleDy -= s(34);
				}
				/* iPad portræt mindmap: ring + fill lidt op */
				if (ipadPortraitRings) {
					circleDy -= s(12);
				}
				[w, h] = shrinkPhoneRing(w, h);
				image.setAttribute('x', String(twCenterX - (w / 2)));
				image.setAttribute('y', String(twCenterY - (h / 2) + circleDy));
				image.setAttribute('width', String(w));
				image.setAttribute('height', String(h));
				image.setAttribute('preserveAspectRatio', 'none');
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'twister-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				wireFrameNavigation(image);

				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(twCenterX + s(4)));
				fill.setAttribute('cy', String(twCenterY - s(2) + circleDy));
				fill.setAttribute('rx', String((((w / 2) * 0.56 - s(4))) * assetS));
				fill.setAttribute('ry', String((((h / 2) * 0.68 - s(4))) * assetS));
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ TWISTER circle image appended to SVG`);
				return;
			}
			
			// Special case: BYENS LANDHANDEL uses the image instead of hand-drawn circle
			if (nodeText === 'Byens Landhandel' || nodeHref.includes('byens-landhandel')) {
				console.log('Creating Byens Landhandel circle image...');
				const byensLandhandelRingScale = 0.78;
				/* Bredere oval vandret (og lidt lavere lodret) end basis 440×170 */
				let byensStretchX = 1.22;
				let byensStretchY = 0.94;
				if (ipadPortraitRings) {
					byensStretchX = 1 + (2.55 - 1) * pRing;
					byensStretchY = 1 + (1.5 - 1) * pRing;
				} else if (ipadLandscapeRings) {
					byensStretchX = 1.38;
					byensStretchY = 0.82;
				}
				let byensMul = 1;
				/* Mobil portræt: gør ovalen smallere vandret (1.22+mul ellers for bred ift. skærm) — landscape/desktop uændret */
				let byensPortraitXNarrow = 1;
				try {
					const ih = mskViewportSize().h || 0;
					const iw = mskViewportSize().w || 1;
					const portrait =
						(container && container.classList && container.classList.contains('projects-mindmap--portrait')) ||
						(window.matchMedia && window.matchMedia('(max-width: 640px)').matches && ih >= iw);
					if (ipadPortraitRings) {
						byensMul = 1.06;
						byensPortraitXNarrow = 1;
					} else if (ipadLandscapeRings) {
						byensMul = 1.08;
						byensPortraitXNarrow = 1;
					} else if (portrait) {
						byensMul = 0.98;
						byensPortraitXNarrow = 0.7;
					}
				} catch {}
				let bw =
					440 *
					byensMul *
					byensLandhandelRingScale *
					projectsDesktopRingMul *
					byensStretchX *
					byensPortraitXNarrow;
				let bh =
					170 *
					byensMul *
					byensLandhandelRingScale *
					projectsDesktopRingMul *
					byensStretchY;
				if (ipadLandscapeRings) bh *= ipadLsRingVertMul;
				[bw, bh] = shrinkPhoneRing(bw, bh);
				/* Kun ring/fill — ikke noden (tekst forbliver) */
				const byensIpadDy = ipadPortraitRings ? -s(14) : ipadLandscapeRings ? -s(12) : 0;
				// Create an image element for BYENS LANDHANDEL
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/circle omkring byens landhandel.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', String(centerX - bw / 2));
				image.setAttribute('y', String(centerY - bh / 2 + byensIpadDy));
				image.setAttribute('width', String(bw));
				image.setAttribute('height', String(bh));
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('preserveAspectRatio', 'none'); // Force stretching
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'byens-landhandel-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				wireFrameNavigation(image);

				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX));
				fill.setAttribute('cy', String(centerY - 2 + byensIpadDy));
				fill.setAttribute(
					'rx',
					String(
						(220 * 0.5 + 3) *
							byensMul *
							byensLandhandelRingScale *
							projectsDesktopRingMul *
							byensStretchX *
							byensPortraitXNarrow
					)
				);
				fill.setAttribute(
					'ry',
					String(
						(85 * 0.58 - 2) *
							byensMul *
							byensLandhandelRingScale *
							projectsDesktopRingMul *
							byensStretchY
					)
				);
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ BYENS LANDHANDEL circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for BYENS LANDHANDEL
			}
			
			// Special case: DUREX X GUESS WHO uses the image instead of hand-drawn circle
			if (nodeText === 'DUREX X GUESS WHO' || nodeHref.includes('durex')) {
				console.log('Creating DUREX X GUESS WHO circle image...');
				// Create an image element for DUREX X GUESS WHO
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/circle omkring durex x guess who.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				let durexMul = 1;
				try {
					const ih = mskViewportSize().h || 0;
					const iw = mskViewportSize().w || 1;
					const ctr = container && container.classList ? container : null;
					const portrait =
						(ctr && ctr.classList.contains('projects-mindmap--portrait')) ||
						(window.matchMedia && window.matchMedia('(max-width: 640px)').matches && ih >= iw);
					/* Portræt: større ring vs. tekst så “GUESS WHO” m.m. sidder mere inde i cirklen */
					if (phonePortraitRings) durexMul = 0.82;
					else if (portrait) durexMul = 0.98;
				} catch {}
				durexMul *= phonePortraitRings ? 0.96 : 0.805; /* cirkel + fill matcher Durex tekst-asset + tab */
				let durexIpadMulW = 1;
				let durexIpadMulH = 1;
				if (ipadPortraitRings) {
					durexIpadMulW = 1 + (1.66 - 1) * pRing;
					durexIpadMulH = 1 + (1.84 - 1) * pRing;
				}
				let durexIpadLsMulW = 1;
				let durexIpadLsMulH = 1;
				if (ipadLandscapeRings) {
					durexIpadLsMulW = 1.44;
					durexIpadLsMulH = 1.14;
				}
				const durexIpadDy = ipadPortraitRings ? s(8) : 0;
				let dw =
					440 * durexMul * projectsDesktopRingMul * durexIpadMulW * durexIpadLsMulW;
				let dh =
					150 * durexMul * projectsDesktopRingMul * durexIpadMulH * durexIpadLsMulH;
				if (ipadLandscapeRings) dh *= 1.1;
				[dw, dh] = shrinkPhoneRing(dw, dh);
				image.setAttribute('x', centerX - dw / 2);
				image.setAttribute('y', centerY + durexIpadDy - dh / 2);
				image.setAttribute('width', String(dw));
				image.setAttribute('height', String(dh));
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('preserveAspectRatio', 'none'); // Force stretching
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'durex-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				wireFrameNavigation(image);

				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX));
				let durexCyOff = 3;
				try {
					if (window.matchMedia && window.matchMedia('(max-width: 640px) and (orientation: portrait)').matches) {
						durexCyOff = 0;
					}
				} catch {}
				fill.setAttribute('cy', String(centerY - durexCyOff + durexIpadDy));
				fill.setAttribute(
					'rx',
					String(220 * durexMul * 0.55 * projectsDesktopRingMul * durexIpadMulW * durexIpadLsMulW)
				);
				fill.setAttribute(
					'ry',
					String(
						(75 * durexMul * 0.68 + 1) *
							projectsDesktopRingMul *
							durexIpadMulH *
							durexIpadLsMulH
					)
				);
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ DUREX X GUESS WHO circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for DUREX X GUESS WHO
			}
			
			// Create soft hand-drawn circle with smooth curves for other nodes
			let baseRadius = (50 + Math.random() * 30) * projectsDesktopRingMul; // 50-80px radius variation (normal size)
			
			const numPoints = 12 + Math.floor(Math.random() * 8); // 12-20 points for smoother curves
			let pathData = '';
			
			for (let p = 0; p < numPoints; p++) {
				const angle = (p / numPoints) * 2 * Math.PI;
				
				// Add gentle irregularity to the radius for each point
				const radiusVariation = (Math.random() - 0.5) * 10; // ±5px variation (normal)
				const angleVariation = (Math.random() - 0.5) * 0.2; // ±0.1 radians (normal)
				
				let currentRadius = baseRadius + radiusVariation;
				const currentAngle = angle + angleVariation;
				
				const x = centerX + Math.cos(currentAngle) * currentRadius;
				const y = centerY + Math.sin(currentAngle) * currentRadius;
				
				if (p === 0) {
					pathData += `M${x},${y}`;
				} else {
					// Use quadratic curves for smooth, soft transitions
					const prevAngle = ((p - 1) / numPoints) * 2 * Math.PI;
					const midAngle = (prevAngle + currentAngle) / 2;
					const controlRadius = baseRadius + (Math.random() - 0.5) * 8; // Control point radius
					const controlX = centerX + Math.cos(midAngle) * controlRadius;
					const controlY = centerY + Math.sin(midAngle) * controlRadius;
					pathData += ` Q${controlX},${controlY} ${x},${y}`;
				}
			}
			// Sometimes add a "tail" - like the person drew too fast and continued past the circle
			const hasTail = Math.random() < 0.4;
			
			if (hasTail) {
				// Don't close the circle, instead extend it with a tail well outside the circle
				const tailAngle = Math.random() * 2 * Math.PI; // Random direction for tails
				const tailLength = 40 + Math.random() * 40; // 40-80px tail length (much longer to go well outside)
				
				// Start the tail from the last point of the circle
				const lastAngle = ((numPoints - 1) / numPoints) * 2 * Math.PI;
				const lastX = centerX + Math.cos(lastAngle) * baseRadius;
				const lastY = centerY + Math.sin(lastAngle) * baseRadius;
				
				// Extend the tail well beyond the circle's edge - make it go much further out
				const tailEndX = lastX + Math.cos(tailAngle) * tailLength;
				const tailEndY = lastY + Math.sin(tailAngle) * tailLength;
				
				// Create a smooth curve for the tail that goes well outside the circle
				const tailControlX = lastX + Math.cos(tailAngle) * (tailLength * 0.6);
				const tailControlY = lastY + Math.sin(tailAngle) * (tailLength * 0.6);
				
				pathData += ` Q${tailControlX},${tailControlY} ${tailEndX},${tailEndY}`;
			} else {
				pathData += ' Z'; // Close the path normally
			}
			
			const circle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			circle.setAttribute('d', pathData);
			
			// Normal styling for other circles
			circle.setAttribute('stroke', '#2a2a2a'); // Softer color
			circle.setAttribute('stroke-width', 1.5 + Math.random() * 1.5); // 1.5-3px stroke width (thinner for softness)
			circle.setAttribute('opacity', 0.4 + Math.random() * 0.3); // 0.4-0.7 opacity (more visible)
			circle.setAttribute('fill', 'none');
			circle.setAttribute('fill-opacity', '0');
			circle.setAttribute('stroke-linecap', 'round');
			circle.setAttribute('stroke-linejoin', 'round');
			circle.setAttribute('filter', 'url(#charcoalTexture)');
			circle.classList.add('hand-drawn-frame');
			circle.dataset.nodeIndex = String(index);
			circle.dataset.nodeHref = nodeHref;
			
			// Fill version behind the stroke path (hover "fills out" the circle)
			const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			fillPath.setAttribute('d', pathData);
			fillPath.setAttribute('fill', 'rgba(118, 75, 162, 0.38)');
			fillPath.setAttribute('stroke', 'none');
			// Shrink fill so it sits inside the hand-drawn outline
			fillPath.setAttribute('transform', `translate(${centerX} ${centerY}) scale(0.70) translate(${-centerX} ${-centerY})`);
			fillPath.classList.add('frame-fill');
			fillPath.dataset.nodeIndex = String(index);
			fillPath.dataset.nodeHref = nodeHref;
			const firstLine = currentSvg.querySelector('.mindmap-line');
			if (firstLine) currentSvg.insertBefore(fillPath, firstLine);
			else currentSvg.appendChild(fillPath);
			
			currentSvg.appendChild(circle);
			wireFrameNavigation(fillPath);

			console.log(`Hand-drawn circle ${index} created for ${node.textContent.trim()}`);
		});
		
		console.log('All hand-drawn circles created. Total SVG children:', currentSvg.children.length);
		const allImages = currentSvg.querySelectorAll('image');
		console.log('Circle images in SVG:', allImages.length);
		
		// Verify each image is actually in the DOM and visible
		allImages.forEach((img, idx) => {
			const href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
			console.log(`Image ${idx}: href="${href}", x=${img.getAttribute('x')}, y=${img.getAttribute('y')}, width=${img.getAttribute('width')}, height=${img.getAttribute('height')}, opacity=${img.getAttribute('opacity')}`);
			console.log(`  - In DOM:`, img.parentNode === currentSvg);
			console.log(`  - Computed display:`, window.getComputedStyle(img).display);
			console.log(`  - Computed visibility:`, window.getComputedStyle(img).visibility);
		});

		mskSyncRepopBrainLineIpadLandscape();
		try {
			mskSyncByensBrainLineIpadLandscape();
		} catch (_) {}
		try {
			mskSyncBrainfartsBrainLineIpadLandscape();
		} catch (_) {}
		try {
			mskApplyUngeModUvIpadLandscapeTitleNudge();
		} catch (_) {}
		try {
			mskApplyDurexIpadLandscapeTitleNudge();
		} catch (_) {}
		try {
			mskSyncBrainfartsIpadConstructionSignOpacity();
		} catch (_) {}
	}


		// Mouse follow for pupils - ULTRA CONSERVATIVE fixed range
		function updatePupilPosition(e) {
			pupils.forEach(pupil => {
				const eye = pupil.parentElement;
				const eyeRect = eye.getBoundingClientRect();
				const eyeCenterX = eyeRect.left + eyeRect.width / 2;
				const eyeCenterY = eyeRect.top + eyeRect.height / 2;
				
				// FIXED small movement range - only 3 pixels maximum
				const maxMoveDistance = 3; // Fixed 3 pixel limit
				
				const deltaX = e.clientX - eyeCenterX;
				const deltaY = e.clientY - eyeCenterY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				
				// ULTRA CONSERVATIVE - pupils can only move 3 pixels maximum
				let moveX, moveY;
				if (distance <= maxMoveDistance) {
					// Mouse is within tiny safe zone
					moveX = deltaX;
					moveY = deltaY;
				} else {
					// Mouse is outside tiny safe zone - constrain to 3 pixel edge
					const angle = Math.atan2(deltaY, deltaX);
					moveX = Math.cos(angle) * maxMoveDistance;
					moveY = Math.sin(angle) * maxMoveDistance;
				}
				
				// Apply movement with ULTRA CONSERVATIVE bounds
				pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
			});
		}

		// Node hover effects (kun enheder med rigtig hover — undgå “låst” klik-/touch-tilstand på mobil)
		function mskProjectsMindmapHoverVisualsEnabled() {
			try {
				return !(window.matchMedia && window.matchMedia('(hover: none)').matches);
			} catch (err) {
				return true;
			}
		}
		const mskMindmapHoverFx = mskProjectsMindmapHoverVisualsEnabled();

		nodes.forEach(node => {
			// BRAINFARTS is "under construction" on the Projects page: keep hover animations,
			// but prevent navigation so it is not clickable.
			node.addEventListener('click', function(e) {
				const href = (this.getAttribute('href') || '').toLowerCase();
				if (!href.includes('brainfarts')) return;
				// Allow normal browser behaviors (new tab, etc.)
				if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();
				e.stopPropagation();
			});

			node.addEventListener('mouseenter', function() {
				if (!mskMindmapHoverFx) return;
				const href = (this.getAttribute('href') || '').toLowerCase();
				const hoverKey = ((this.dataset && this.dataset.hoverKey) ? this.dataset.hoverKey : href).toLowerCase();
				console.log('Hovering over:', href, 'hoverKey:', hoverKey);

				// TWISTER hover: spark animation over D&AD logo
				const badge = document.querySelector('.dandd-badge:not(.dandd-badge--inline)');
				if (badge) {
					if (hoverKey.includes('twister')) badge.classList.add('is-sparking');
					else badge.classList.remove('is-sparking');
				}

				// REPOP hover: star-burst animation over the Kravlinprisen text
				const kravlingBadge = document.querySelector('.kravling-nomineret-badge');
				if (kravlingBadge) {
					if (hoverKey.includes('repop')) kravlingBadge.classList.add('is-sparking');
					else kravlingBadge.classList.remove('is-sparking');
				}

				// KØ-BAJER hover: charcoal ray animation over the Kravlingprisen 2024 badge
				const kobajerKravling2024 = document.querySelector('.kobajer-kravling-2024-badge');
				if (kobajerKravling2024) {
					if (hoverKey.includes('kobajer')) kobajerKravling2024.classList.add('is-sparking');
					else kobajerKravling2024.classList.remove('is-sparking');
				}

				// Brain blush should appear ONLY when hovering BRAINFARTS
				if (brain) {
					if (hoverKey.includes('brainfarts')) brain.classList.add('is-blushing');
					else brain.classList.remove('is-blushing');
				}
				// Brain should fart ONLY when hovering BRAINFARTS
				if (hoverKey.includes('brainfarts')) startBrainFart();
				else stopBrainFart();

				// Make it clear the tab is clickable: pulse the matching hand-drawn circle frame
				const container = document.querySelector('.brainstorm-container');
				const currentSvg = document.querySelector('.connecting-lines');
				const idx = this.dataset.nodeIndex;
				const nodeHref = (this.dataset.nodeHref || href).toLowerCase();
				const frame =
					(container &&
						nodeHref &&
						container.querySelector(
							`.msk-portrait-ring-overlay.hand-drawn-frame[data-node-href="${nodeHref}"]`
						)) ||
					(currentSvg &&
						nodeHref &&
						currentSvg.querySelector(`.hand-drawn-frame[data-node-href="${nodeHref}"]`)) ||
					(container &&
						idx &&
						container.querySelector(
							`.msk-portrait-ring-overlay.hand-drawn-frame[data-node-index="${idx}"]`
						)) ||
					(currentSvg && idx && currentSvg.querySelector(`.hand-drawn-frame[data-node-index="${idx}"]`));
				const fill =
					(currentSvg && nodeHref && currentSvg.querySelector(`.frame-fill[data-node-href="${nodeHref}"]`)) ||
					(currentSvg && idx && currentSvg.querySelector(`.frame-fill[data-node-index="${idx}"]`));
				const line =
					(currentSvg && nodeHref && currentSvg.querySelector(`.mindmap-line[data-node-href="${nodeHref}"]`)) ||
					(currentSvg && idx && currentSvg.querySelector(`.mindmap-line[data-node-index="${idx}"]`));

				if (fill) fill.classList.add('is-hovered');

				if (frame) {
					frame.classList.add('is-hovered');
					// Extra explicit inline styling so the purple highlight shows even if CSS is overridden
					frame.style.opacity = '1';
					frame.style.filter = 'drop-shadow(0 0 16px rgba(118, 75, 162, 0.65)) drop-shadow(0 0 28px rgba(102, 126, 234, 0.55)) drop-shadow(0 10px 18px rgba(0,0,0,0.22)) brightness(1.08)';
				}

				// Ensure the hovered line is visually complete (above the purple fill ellipse).
				// Durex: ikke flyt linjen til slutningen — så ligger linje 6 under cirkel-asset (appendChild ellers mal ovenpå ringen).
				if (line && line.parentNode === currentSvg && !hoverKey.includes('durex')) {
					currentSvg.appendChild(line);
				}
				const condomAsset = document.querySelector('.condom-asset');
				const kornAsset = document.querySelector('.korn-asset');
				const kasketAsset = document.querySelector('.kasket-asset');
				const oldaseAsset = document.querySelector('.oldase-asset');
				const naturliAsset = document.querySelector('.naturli-asset');
				const dropsAsset = document.querySelector('.naturli-drops-asset');
				const twisterAsset = document.querySelector('.twister-asset');
				const ungeModUvAsset = document.querySelector('.unge-mod-uv-asset');
				
				// Different expressions and assets for different projects
				if (hoverKey.includes('durex')) {
					// Durex - show condom asset
					console.log('Durex hover detected, showing condom asset');
					if (condomAsset) {
						condomAsset.style.display = 'block';
						condomAsset.style.animation = 'condomAppear 0.5s ease-in-out forwards';
						console.log('Condom asset should be visible now');
					} else {
						console.log('Condom asset not found');
					}
				} else if (hoverKey.includes('byens-landhandel')) {
					// Byens Landhandel - show korn asset
					if (kornAsset) {
						kornAsset.style.display = 'block';
						kornAsset.style.opacity = '1';
						kornAsset.style.animation = 'kornRotateOnce 1.1s ease-in-out forwards';
					}
				} else if (hoverKey.includes('repop')) {
					// Repop - show kasket asset
					if (kasketAsset) {
						kasketAsset.style.display = 'block';
						kasketAsset.style.animation = 'kasketFall 0.8s ease-in-out forwards';
					}
				} else if (hoverKey.includes('kobajer')) {
					// Købajer - show øldåse asset
					if (oldaseAsset) {
						oldaseAsset.style.display = 'block';
						oldaseAsset.style.animation = 'oldaseAppear 0.5s ease-in-out forwards';
					}
				} else if (hoverKey.includes('naturli')) {
					// Naturli' - show bottle and drops
					if (naturliAsset) {
						naturliAsset.style.display = 'block';
						// Restart animation reliably on repeated hovers
						naturliAsset.style.animation = 'none';
						// Force reflow
						void naturliAsset.offsetHeight;
						naturliAsset.style.animation = 'naturliSqueeze3 2.2s ease-in-out forwards';
					}
					if (dropsAsset) {
						dropsAsset.style.display = 'block';
						// Restart animation reliably on repeated hovers
						dropsAsset.style.animation = 'none';
						// Force reflow
						void dropsAsset.offsetHeight;
						dropsAsset.style.animation = 'naturliDropsBurst3 2.2s ease-in-out forwards';
					}
				} else if (hoverKey.includes('twister')) {
					// Twister - show twister asset
					if (twisterAsset) {
						twisterAsset.style.display = 'block';
						twisterAsset.style.animation = 'twisterAppear 0.5s ease-in-out forwards';
					}
					// Tongue lick: left->right OVER icecream, then right->left UNDER icecream
					if (brain) {
						brain.dataset.twisterTongueActive = '1';
						startTwisterTongue();
					}
					// Playful expression
					if (mouth) {
						mouth.setAttribute('d', 'M35,58 Q50,63 65,58');
					}
				} else if (hoverKey.includes('unge-mod-uv')) {
					// Unge mod UV - show asset
					if (ungeModUvAsset) {
						ungeModUvAsset.style.display = 'block';
						ungeModUvAsset.style.animation = 'ungeModUvAppear 0.5s ease-in-out forwards';
					}
					// Happy expression
					if (mouth) {
						mouth.setAttribute('d', 'M35,58 Q50,65 65,58');
					}
				} else if (hoverKey.includes('brainfarts') || hoverKey.includes('project1')) {
					// BRAINFARTS - embarrassed expression
					if (mouth) {
						mouth.setAttribute('d', 'M35,58 Q50,55 65,58');
					}
				}
			});

			node.addEventListener('mouseleave', function() {
				if (!mskMindmapHoverFx) return;
				const href = this.getAttribute('href');
				const container = document.querySelector('.brainstorm-container');
				const currentSvg = document.querySelector('.connecting-lines');
				const idx = this.dataset.nodeIndex;
				const nodeHref = (this.dataset.nodeHref || (href || '')).toLowerCase();
				const frame =
					(container &&
						nodeHref &&
						container.querySelector(
							`.msk-portrait-ring-overlay.hand-drawn-frame[data-node-href="${nodeHref}"]`
						)) ||
					(currentSvg &&
						nodeHref &&
						currentSvg.querySelector(`.hand-drawn-frame[data-node-href="${nodeHref}"]`)) ||
					(container &&
						idx &&
						container.querySelector(
							`.msk-portrait-ring-overlay.hand-drawn-frame[data-node-index="${idx}"]`
						)) ||
					(currentSvg && idx && currentSvg.querySelector(`.hand-drawn-frame[data-node-index="${idx}"]`));
				const fill =
					(currentSvg && nodeHref && currentSvg.querySelector(`.frame-fill[data-node-href="${nodeHref}"]`)) ||
					(currentSvg && idx && currentSvg.querySelector(`.frame-fill[data-node-index="${idx}"]`));

				if (fill) fill.classList.remove('is-hovered');

				if (frame) {
					frame.classList.remove('is-hovered');
					frame.style.filter = '';
					frame.style.opacity = '';
				}

				// Hide brain blush when leaving any tab
				if (brain) brain.classList.remove('is-blushing');
				// Stop farting when leaving
				stopBrainFart();
				// Stop D&AD sparks when leaving
				const badge = document.querySelector('.dandd-badge:not(.dandd-badge--inline)');
				if (badge) badge.classList.remove('is-sparking');
				// Stop Kravling stars when leaving
				const kravlingBadge = document.querySelector('.kravling-nomineret-badge');
				if (kravlingBadge) kravlingBadge.classList.remove('is-sparking');
				// Stop KØ-BAJER Kravling 2024 charcoal rays when leaving
				const kobajerKravling2024 = document.querySelector('.kobajer-kravling-2024-badge');
				if (kobajerKravling2024) kobajerKravling2024.classList.remove('is-sparking');
				// Stop Twister tongue on leave
				stopTwisterTongue();
				const condomAsset = document.querySelector('.condom-asset');
				const kornAsset = document.querySelector('.korn-asset');
				const kasketAsset = document.querySelector('.kasket-asset');
				const oldaseAsset = document.querySelector('.oldase-asset');
				const naturliAsset = document.querySelector('.naturli-asset');
				const dropsAsset = document.querySelector('.naturli-drops-asset');
				const twisterAsset = document.querySelector('.twister-asset');
				const ungeModUvAsset = document.querySelector('.unge-mod-uv-asset');
				
				// Hide all assets
				[condomAsset, kornAsset, kasketAsset, oldaseAsset, naturliAsset, dropsAsset, twisterAsset, ungeModUvAsset].forEach(asset => {
					if (asset) {
						asset.style.display = 'none';
						asset.style.animation = 'none';
					}
				});
				
				// Reset to normal expression
				if (mouth) {
					mouth.setAttribute('d', 'M38,58 Q50,61 62,58');
				}
			});
		});

		// Initialize
		// The red dots should look like the brain is blushing, so render them on the brain itself.
		createBrainBlush();
		createAssets();
		createTwisterTongues();

		// Ensure nodes are placed before drawing lines/frames.
		mskApplyProjectsPortraitPhoneCanvasStyles();
		positionNodesPerfectCircle();
		refreshProjectsMindmapStandaloneExtras();
		mskEnsureProjectsPortraitSvgBox();

		let mskPortraitPaintRetryCount = 0;
		let mskLandscapePaintRetryCount = 0;

		function paintProjectsMindmapGraphics(force) {
			const redrawOpts = { force: !!force };
			if (force) {
				try {
					const svg = document.querySelector('.connecting-lines');
					if (svg) delete svg.dataset.mskDynamicGraphicsBuilt;
				} catch (_) {}
			}
			mskProjectsSyncLayoutBeforePaint();
			createConnectingLines(redrawOpts);
			createHandDrawnFrames(redrawOpts);
			mskProjectsMindmapMarkGraphicsBuilt();
			try {
				if (
					mskIsProjectsPortraitTouchGridMode() &&
					!mskProjectsMindmapPortraitFramesReady() &&
					mskPortraitPaintRetryCount < 8
				) {
					mskPortraitPaintRetryCount += 1;
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							try {
								positionNodesPerfectCircle();
								mskProjectsSyncLayoutBeforePaint();
								paintProjectsMindmapGraphics(true);
							} catch (_) {}
						});
					});
				} else if (
					mskIsProjectsTabletLandscapeViewport() &&
					!mskProjectsMindmapIpadLandscapeFramesReady() &&
					mskLandscapePaintRetryCount < 8
				) {
					mskLandscapePaintRetryCount += 1;
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							try {
								positionNodesPerfectCircle();
								mskProjectsSyncLayoutBeforePaint();
								paintProjectsMindmapGraphics(true);
							} catch (_) {}
						});
					});
				}
			} catch (_) {}
		}

		try {
			paintProjectsMindmapGraphics(true);
		} catch (paintErr) {
			try {
				console.error('Projects mindmap paint failed:', paintErr);
			} catch (_) {}
		}

		// Create hand-drawn frames around project tabs
		try {
			positionBrainfartsBuildNote();
			try {
				mskApplyBrainfartsIpadLandscapeConstructionSign();
				mskSyncBrainfartsIpadConstructionSignOpacity();
			} catch (_) {}
		} finally {
			mskApplyProjectsPortraitPhoneCanvasStyles();
			mskProjectsMindmapReveal();
			try {
				if (mskIsProjectsPortraitTouchGridMode()) {
					window.scrollTo(0, 0);
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							try {
								positionNodesPerfectCircle();
								refreshProjectsMindmapStandaloneExtras();
								mskEnsureProjectsPortraitSvgBox();
								paintProjectsMindmapGraphics(true);
								positionBrainfartsBuildNote();
							} catch (_) {}
						});
					});
				}
			} catch (_) {}
		}

		document.addEventListener('mousemove', updatePupilPosition);

		function runProjectsMindmapLayoutTick(force) {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					try {
						const layoutChanged = !!(force || mskProjectsMindmapLayoutResizeMeaningful());
						const needsGraphics =
							layoutChanged ||
							mskProjectsMindmapNeedsGraphicRebuild() ||
							(force &&
								(mskIsProjectsPortraitTouchGridMode() ||
									mskIsProjectsTabletLandscapeViewport()));
						const alreadyPainted = document.documentElement.classList.contains(
							'msk-projects-mindmap-painted'
						);
						if (!layoutChanged && !needsGraphics && alreadyPainted) return;

						if (layoutChanged) {
							positionNodesPerfectCircle();
						}
						refreshProjectsMindmapStandaloneExtras();
						mskApplyProjectsPortraitPhoneCanvasStyles();
						mskProjectsSyncLayoutBeforePaint();
						if (needsGraphics) {
							const redrawOpts = { force: true };
							try {
								const svg = document.querySelector('.connecting-lines');
								if (svg) delete svg.dataset.mskDynamicGraphicsBuilt;
							} catch (_) {}
							createConnectingLines(redrawOpts);
							createHandDrawnFrames(redrawOpts);
							mskProjectsMindmapMarkGraphicsBuilt();
						}
						positionBrainfartsBuildNote();
						try {
							mskApplyBrainfartsIpadLandscapeConstructionSign();
							mskSyncBrainfartsIpadConstructionSignOpacity();
						} catch (_) {}
						const lv = mskProjectsLayoutViewportBox();
						mskProjectsMindmapLastLayoutIw = lv.w;
						mskProjectsMindmapLastLayoutIh = lv.h;
					} catch {}
				});
			});
		}

		function refreshProjectsMindmapLayout() {
			/* Samle burst (resize + flere inner*-flap) — undgå at fjerne alle .dynamic-mindmap-line flere gange i træk */
			try {
				if (mskProjectsMindmapRefreshDebounce) clearTimeout(mskProjectsMindmapRefreshDebounce);
			} catch {}
			mskProjectsMindmapRefreshDebounce = setTimeout(() => {
				mskProjectsMindmapRefreshDebounce = null;
				if (!mskProjectsMindmapLayoutResizeMeaningful()) return;
				runProjectsMindmapLayoutTick();
			}, 150);
		}
		try {
			const _lv0 = mskProjectsLayoutViewportBox();
			mskProjectsMindmapLastLayoutIw = _lv0.w;
			mskProjectsMindmapLastLayoutIh = _lv0.h;
		} catch {}
		try {
			window.__mskProjectsRelayout = runProjectsMindmapLayoutTick;
			window.__mskProjectsRepaintPortraitGraphics = function (force) {
				try {
					runProjectsMindmapLayoutTick(!!force);
				} catch (_) {}
			};
		} catch (_) {}

		if (!document.documentElement.dataset.mskProjectsMindmapRelisten) {
			document.documentElement.dataset.mskProjectsMindmapRelisten = '1';
			window.addEventListener('msk-relayout-projects-mindmap', () => {
				try {
					mskProjectsMindmapLastLayoutIw = -1;
					mskProjectsMindmapLastLayoutIh = -1;
				} catch {}
				try {
					mskApplyProjectsIpadLandscapeDocumentMode();
					runProjectsMindmapLayoutTick(true);
				} catch {}
			});
		}

		window.addEventListener('resize', refreshProjectsMindmapLayout);
		/* Chrome: flere resize-ticks efter rotation — ekstra pass når mål er stabile */
		window.addEventListener('orientationchange', () => {
			try {
				mskProjectsMindmapLastLayoutIw = -1;
				mskProjectsMindmapLastLayoutIh = -1;
			} catch {}
			try {
				if (mskProjectsMindmapRefreshDebounce) clearTimeout(mskProjectsMindmapRefreshDebounce);
			} catch {}
			[40, 280, 520].forEach((ms) => {
				setTimeout(() => mskProjectsMindmapRelayoutAfterTabletOrientation(true), ms);
			});
		});
		/* Fuld layout: window.resize + orientationchange (ingen visualViewport-overlay — undgår hoppende streger). */

		// Mark as initialized to avoid duplicate event listeners on re-run.
		brain.dataset.animInit = '1';
		try {
			mskBindProjectsMindmapLinkBlurAfterTap();
		} catch (_) {}
		if (isPreview) {
			try {
				const container = document.querySelector('.brainstorm-container');
				if (container) {
					container.classList.add('preview-ready');
					container.dataset.mskRevealed = '1';
					document.documentElement.classList.remove('msk-mindmap-booting');
					document.documentElement.classList.add('msk-projects-mindmap-painted');
				}
			} catch {}
		}
	}

	// Initialize brain animations (eksponeret til failsafe i projects.html)
	try {
		window.__mskProjectsMindmapInitFn = initBrainAnimations;
	} catch (_) {}
	initBrainAnimations();

	// Re-run init when navigating to the projects section (e.g. clicking "projekter")
	window.addEventListener('hashchange', () => setTimeout(initBrainAnimations, 50));
	document.addEventListener('click', (e) => {
		const a = e.target && e.target.closest ? e.target.closest('a') : null;
		const href = a ? (a.getAttribute('href') || '') : '';
		if (href.toLowerCase().includes('projekter') || href.toLowerCase().includes('#projekter')) {
			setTimeout(initBrainAnimations, 50);
		}
	});
});

/* Samme video-play design hvis DOM allerede er klar (script sidst i body), ved tilbage fra bfcache, m.m. */
try {
	if (document.readyState !== 'loading') {
		mskInitNativeVideoPlayOverlays();
	}
} catch {}
try {
	window.addEventListener('pageshow', function (ev) {
		try {
			if (ev.persisted) mskInitNativeVideoPlayOverlays();
		} catch {}
	});
} catch {}

// Ensure lazy video init runs after DOM is ready
window.addEventListener('load', function () {
	const lazyContainers = document.querySelectorAll('.video-lazy');
	lazyContainers.forEach((container) => {
		if (container.getAttribute('data-bound') === 'true') return;
		container.setAttribute('data-bound', 'true');
		container.addEventListener('click', function () {
			const videoId = container.getAttribute('data-video-id');
			if (!videoId) return;
			const iframe = document.createElement('iframe');
			iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
			iframe.title = 'Twister Video';
			iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			iframe.allowFullscreen = true;
			iframe.referrerPolicy = 'strict-origin-when-cross-origin';
			iframe.style.position = 'absolute';
			iframe.style.inset = '0';
			iframe.style.width = '100%';
			iframe.style.height = '100%';
			iframe.style.border = '0';
			container.innerHTML = '';
			container.appendChild(iframe);
		});
	});
}); 

/**
 * Projektsider: klik på billeder åbner central lightbox; video med dobbeltklik (enkeltklik = afspil inline).
 * Afvis med data-no-lightbox på elementet eller forælder .msk-no-asset-lightbox.
 */
(function initMskProjectAssetLightbox() {
	const LB_ID = 'msk-asset-lightbox';
	let lastFocus = null;

	function isLightboxPage() {
		try {
			if (window.self !== window.top) return false;
			if (document.documentElement.classList.contains('transition-preview')) return false;
			const b = document.body;
			if (!b || !b.classList) return false;
			const deny = new Set([
				'projects-page',
				'home-notebook-page',
				'about-sketchbook-page',
				'contact-sketchbook-page',
			]);
			return [...b.classList].some((c) => c.endsWith('-page') && !deny.has(c));
		} catch {
			return false;
		}
	}

	function hasNoLightbox(el) {
		let n = el;
		for (let i = 0; i < 12 && n; i++) {
			if (n.getAttribute && n.getAttribute('data-no-lightbox') !== null) return true;
			if (n.classList && n.classList.contains('msk-no-asset-lightbox')) return true;
			n = n.parentElement;
		}
		return false;
	}

	function shouldExcludeImg(el) {
		if (!el || String(el.tagName).toLowerCase() !== 'img') return true;
		if (hasNoLightbox(el)) return true;
		if (el.closest && el.closest('.navbar')) return true;
		if (el.closest && el.closest(`#${LB_ID}`)) return true;
		const alt = (el.getAttribute('alt') || '').toLowerCase();
		if (/\blogo\b/i.test(alt)) return true;
		const cls = String(el.className || '').toLowerCase();
		if (cls.includes('logo') && !cls.includes('poster') && !cls.includes('headline')) return true;
		return false;
	}

	function shouldExcludeVideo(el) {
		if (!el || String(el.tagName).toLowerCase() !== 'video') return true;
		if (hasNoLightbox(el)) return true;
		if (el.closest && el.closest('.navbar')) return true;
		if (el.closest && el.closest(`#${LB_ID}`)) return true;
		return false;
	}

	/**
	 * Samme kant-sanitering som --vh/--vw på projektsider (layout + inner), samme tal som du ser i DevTools.
	 * Bruges til lightbox: layout-kanter + orienterings-korrektur (RDM/WebKit).
	 */
	function mskAssetLightboxViewportSidesPx() {
		const lb = mskProjectsLayoutViewportBox();
		let rw = lb.w;
		let rh = lb.h;
		const iw = Math.round(Math.max(1, window.innerWidth || 0));
		const ih = Math.round(Math.max(1, window.innerHeight || 0));
		if (ih >= 200) rh = Math.round(Math.max(rh, ih, lb.h));
		if (iw >= 200) rw = Math.round(Math.max(rw, iw, lb.w));
		if (rh < 80 && lb.h >= 80) rh = lb.h;
		if (rw < 80 && lb.w >= 80) rw = lb.w;

		/*
		 * RDM / WebKit kan bytte clientWidth ↔ clientHeight ift. orientation.
		 * Brug CSS orientation + fallback så “bred” altid er layout-bredde og “høj” layout-højde.
		 */
		let portrait;
		try {
			portrait = window.matchMedia ? window.matchMedia('(orientation: portrait)').matches : null;
		} catch {
			portrait = null;
		}
		if (portrait == null) {
			try {
				const ot = screen.orientation && screen.orientation.type;
				if (ot && String(ot).includes('portrait')) portrait = true;
				else if (ot && String(ot).includes('landscape')) portrait = false;
			} catch {
				portrait = null;
			}
		}
		if (portrait == null) {
			portrait = rh >= rw;
		}
		if (portrait && rw > rh) {
			const tmp = rw;
			rw = rh;
			rh = tmp;
		} else if (!portrait && rh > rw) {
			const tmp = rw;
			rw = rh;
			rh = tmp;
		}
		return { rw, rh };
	}

	function applyMskAssetLightboxBox(root) {
		if (!root) return;
		let rw;
		let rh;
		const dRw = root.dataset.mskLbRw;
		const dRh = root.dataset.mskLbRh;
		if (dRw != null && dRw !== '' && dRh != null && dRh !== '') {
			rw = parseFloat(dRw, 10);
			rh = parseFloat(dRh, 10);
		}
		if (!(Number.isFinite(rw) && rw > 0 && Number.isFinite(rh) && rh > 0)) {
			const b = mskAssetLightboxViewportSidesPx();
			rw = b.rw;
			rh = b.rh;
			try {
				root.dataset.mskLbRw = String(rw);
				root.dataset.mskLbRh = String(rh);
			} catch {}
		}
		/*
		 * Bredde ≈ layout-bredde, højde ≈ layout-højde (normaliseret i mskAssetLightboxViewportSidesPx).
		 */
		const frameW = Math.min(0.96 * rw, 1020);
		const padReserve = 72;
		const stageH = Math.min(0.78 * rh, 900, Math.max(160, rh - padReserve));
		const frame = root.querySelector('.msk-asset-lightbox__frame');
		const stage = root.querySelector('.msk-asset-lightbox__stage');
		if (!frame || !stage) return;
		const fw = `${Math.round(frameW)}px`;
		const sh = `${Math.round(stageH)}px`;
		/* important: slår eventuel side-specifik !important/overskrivning i RDM */
		frame.style.setProperty('width', fw, 'important');
		frame.style.setProperty('min-width', fw, 'important');
		frame.style.setProperty('max-width', fw, 'important');
		stage.style.setProperty('width', fw, 'important');
		stage.style.setProperty('min-width', fw, 'important');
		stage.style.setProperty('max-width', fw, 'important');
		stage.style.setProperty('min-height', sh, 'important');
		stage.style.setProperty('height', sh, 'important');
		stage.style.setProperty('max-height', sh, 'important');
	}

	function clearMskAssetLightboxBox(root) {
		if (!root) return;
		const frame = root.querySelector('.msk-asset-lightbox__frame');
		const stage = root.querySelector('.msk-asset-lightbox__stage');
		if (frame) {
			frame.style.removeProperty('width');
			frame.style.removeProperty('min-width');
			frame.style.removeProperty('max-width');
		}
		if (stage) {
			try {
				stage.style.removeProperty('width');
				stage.style.removeProperty('min-width');
				stage.style.removeProperty('max-width');
			} catch {}
			stage.style.removeProperty('min-height');
			stage.style.removeProperty('height');
			stage.style.removeProperty('max-height');
		}
		try {
			delete root.dataset.mskLbRw;
			delete root.dataset.mskLbRh;
			delete root.dataset.mskLbVmin;
		} catch {}
	}

	function ensureShell() {
		let root = document.getElementById(LB_ID);
		if (root) return root;
		root = document.createElement('div');
		root.id = LB_ID;
		root.className = 'msk-asset-lightbox';
		root.setAttribute('role', 'dialog');
		root.setAttribute('aria-modal', 'true');
		root.setAttribute('aria-hidden', 'true');
		root.innerHTML = [
			'<div class="msk-asset-lightbox__backdrop" data-msk-lb-dismiss="1"></div>',
			'<button type="button" class="msk-asset-lightbox__close" aria-label="Luk"></button>',
			'<div class="msk-asset-lightbox__frame">',
			'<div class="msk-asset-lightbox__stage"></div>',
			'</div>',
		].join('');
		document.body.appendChild(root);
		root.querySelector('.msk-asset-lightbox__backdrop').addEventListener('click', close);
		root.querySelector('.msk-asset-lightbox__close').addEventListener('click', (e) => {
			try {
				e.preventDefault();
			} catch {}
			close();
		});
		return root;
	}

	function buildVideoFrom(sourceEl) {
		const v = document.createElement('video');
		v.setAttribute('controls', '');
		v.setAttribute('playsinline', '');
		v.className = 'msk-asset-lightbox__video';
		const poster = sourceEl.getAttribute('poster');
		if (poster) v.setAttribute('poster', poster);
		let got = false;
		try {
			sourceEl.querySelectorAll('source').forEach((s) => {
				const u = s.getAttribute('src') || s.src;
				if (!u) return;
				const ns = document.createElement('source');
				ns.src = u;
				if (s.getAttribute('type')) ns.setAttribute('type', s.getAttribute('type'));
				v.appendChild(ns);
				got = true;
			});
		} catch {}
		if (!got && sourceEl.currentSrc) {
			v.src = sourceEl.currentSrc;
		} else if (!got && sourceEl.src) {
			v.src = sourceEl.src;
		}
		try {
			v.load();
		} catch {}
		return v;
	}

	function openFromImg(el) {
		const root = ensureShell();
		try {
			delete root.dataset.mskLbRw;
			delete root.dataset.mskLbRh;
			delete root.dataset.mskLbVmin;
		} catch {}
		const stage = root.querySelector('.msk-asset-lightbox__stage');
		stage.innerHTML = '';
		const fullSrc = el.getAttribute('data-lightbox-src') || el.currentSrc || el.getAttribute('src');
		const img = document.createElement('img');
		img.src = fullSrc;
		img.alt = el.getAttribute('alt') || '';
		img.className = 'msk-asset-lightbox__img';
		img.decoding = 'async';
		img.loading = 'eager';
		stage.appendChild(img);
		img.addEventListener(
			'load',
			() => {
				try {
					applyMskAssetLightboxBox(root);
				} catch {}
			},
			{ once: true },
		);
		try {
			if (img.decode) {
				img.decode().then(
					() => {
						try {
							applyMskAssetLightboxBox(root);
						} catch {}
					},
					() => {},
				);
			}
		} catch {}
		root.setAttribute('aria-hidden', 'false');
		root.classList.add('is-open');
		document.body.classList.add('msk-asset-lightbox-open');
		lastFocus = document.activeElement;
		/* Fokus på dialog-roden — ikke på luk-knappen (undgår at knappen skifter udseende 1. vs 2. åbning pga. :focus) */
		try {
			if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
			root.focus({ preventScroll: true });
		} catch {}
		applyMskAssetLightboxBox(root);
		try {
			requestAnimationFrame(() => applyMskAssetLightboxBox(root));
		} catch {}
	}

	function openFromVideo(sourceEl) {
		try {
			sourceEl.pause();
		} catch {}
		const root = ensureShell();
		try {
			delete root.dataset.mskLbRw;
			delete root.dataset.mskLbRh;
			delete root.dataset.mskLbVmin;
		} catch {}
		const stage = root.querySelector('.msk-asset-lightbox__stage');
		stage.innerHTML = '';
		stage.appendChild(buildVideoFrom(sourceEl));
		try {
			mskInitNativeVideoPlayOverlays();
		} catch {}
		root.setAttribute('aria-hidden', 'false');
		root.classList.add('is-open');
		document.body.classList.add('msk-asset-lightbox-open');
		lastFocus = document.activeElement;
		try {
			if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
			root.focus({ preventScroll: true });
		} catch {}
		applyMskAssetLightboxBox(root);
		try {
			requestAnimationFrame(() => applyMskAssetLightboxBox(root));
		} catch {}
	}

	function close() {
		const root = document.getElementById(LB_ID);
		if (!root || !root.classList.contains('is-open')) return;
		clearMskAssetLightboxBox(root);
		const v = root.querySelector('.msk-asset-lightbox__video');
		if (v) {
			try {
				v.pause();
			} catch {}
		}
		const stage = root.querySelector('.msk-asset-lightbox__stage');
		if (stage) stage.innerHTML = '';
		root.classList.remove('is-open');
		root.setAttribute('aria-hidden', 'true');
		document.body.classList.remove('msk-asset-lightbox-open');
		try {
			root.blur();
		} catch {}
		if (lastFocus && typeof lastFocus.focus === 'function') {
			try {
				lastFocus.focus();
			} catch {}
		}
		lastFocus = null;
	}

	function isDesktopPointerLightbox() {
		try {
			return window.matchMedia && window.matchMedia('(hover: hover)').matches;
		} catch {
			return true;
		}
	}

	document.addEventListener(
		'click',
		(e) => {
			if (!isLightboxPage()) return;
			const t = e.target;
			if (!t || !t.tagName) return;
			const tag = String(t.tagName).toLowerCase();

			if (tag === 'img') {
				if (shouldExcludeImg(t)) return;
				try {
					e.preventDefault();
					e.stopPropagation();
				} catch {}
				openFromImg(t);
				return;
			}

			/* Computer / mus: ét klik åbner video i lightbox. Touch: enkeltklik = afspilning; brug dobbeltklik. */
			if (tag === 'video') {
				if (!isDesktopPointerLightbox()) return;
				if (shouldExcludeVideo(t)) return;
				try {
					e.preventDefault();
					e.stopPropagation();
				} catch {}
				openFromVideo(t);
			}
		},
		true
	);

	document.addEventListener(
		'dblclick',
		(e) => {
			if (!isLightboxPage()) return;
			if (isDesktopPointerLightbox()) return;
			const t = e.target;
			if (!t || String(t.tagName).toLowerCase() !== 'video') return;
			if (shouldExcludeVideo(t)) return;
			try {
				e.preventDefault();
				e.stopPropagation();
			} catch {}
			openFromVideo(t);
		},
		true
	);

	document.addEventListener('keydown', (e) => {
		if (e.key !== 'Escape') return;
		const root = document.getElementById(LB_ID);
		if (!root || !root.classList.contains('is-open')) return;
		try {
			e.preventDefault();
		} catch {}
		close();
	});

	function onMskAssetLightboxViewportChange() {
		try {
			const root = document.getElementById(LB_ID);
			if (root && root.classList.contains('is-open')) {
				try {
					delete root.dataset.mskLbRw;
					delete root.dataset.mskLbRh;
					delete root.dataset.mskLbVmin;
				} catch {}
				applyMskAssetLightboxBox(root);
			}
		} catch {}
	}
	window.addEventListener('resize', onMskAssetLightboxViewportChange, { passive: true });
	window.addEventListener('orientationchange', onMskAssetLightboxViewportChange, { passive: true });
	try {
		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', onMskAssetLightboxViewportChange, { passive: true });
		}
	} catch {}

	function refreshLightboxRootClass() {
		try {
			document.documentElement.classList.toggle('msk-asset-lightbox-active', isLightboxPage());
		} catch {}
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', refreshLightboxRootClass);
	} else {
		refreshLightboxRootClass();
	}
})();

// Global corner page-turn handles (all pages).
// Uses simple drag-threshold navigation, and triggers existing click-based flip transitions when available.
(function initGlobalCornerPageTurnHandles() {
	try {
		// Never add handles inside iframes (preview/measure/reveal overlays).
		if (window.self !== window.top) return;
	} catch {
		return;
	}

	try {
		const qs = (window.location.search || '').toLowerCase();
		if (qs.includes('preview=1') || qs.includes('measure=1') || qs.includes('reveal=1')) return;
	} catch {}

	// If a page already injected its own handles (interactive), don't add duplicates.
	if (document.querySelector('.page-turn-handle--left') || document.querySelector('.page-turn-handle--right')) return;

	const DRAG_PX = Math.max(220, Math.min(520, Math.round((mskViewportSize().w || window.innerWidth) * 0.32)));
	const THRESH = Math.round(DRAG_PX * 0.5); // only commit after passing the middle

	function normalizeFileName() {
		let p = '';
		try { p = (window.location.pathname || ''); } catch {}
		p = (p.split('?')[0] || '').toLowerCase();
		const parts = p.split('/').filter(Boolean);
		const last = parts.length ? parts[parts.length - 1] : '';
		return last || 'index.html';
	}

	// Linear reading order (no wrap-around):
	// Projekter is the start page, Kontakt is the end page.
	const order = ['projects.html', 'about.html', 'contact.html'];
	const cur = normalizeFileName();
	const idx = order.indexOf(cur);
	const prev = (idx > 0) ? order[idx - 1] : null;
	const next = (idx >= 0 && idx < order.length - 1) ? order[idx + 1] : null;

	function ensureHandle(side) {
		const el = document.createElement('div');
		el.className = `page-turn-handle page-turn-handle--${side}`;
		el.setAttribute('aria-hidden', 'true');
		el.dataset.target = (side === 'left') ? prev : next;
		document.body.appendChild(el);
		return el;
	}

	function triggerNav(targetFile) {
		if (!targetFile) return;
		try {
			const a = document.querySelector(`a[href="${CSS.escape(targetFile)}"]`);
			if (a) { a.click(); return; } // lets existing flip handlers run
		} catch {}
		try { window.location.href = targetFile; } catch {}
	}

	const left = prev ? ensureHandle('left') : null;
	const right = next ? ensureHandle('right') : null;

	// Bottom-left: pull to the RIGHT to go to prev.
	if (left) left.addEventListener('pointerdown', (e) => {
		if (!e || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		const startX = e.clientX;
		const onUp = (ev) => {
			window.removeEventListener('pointerup', onUp, true);
			window.removeEventListener('pointercancel', onUp, true);
			const dx = (ev && typeof ev.clientX === 'number') ? (ev.clientX - startX) : 0;
			if (dx >= THRESH) triggerNav(left.dataset.target);
		};
		window.addEventListener('pointerup', onUp, true);
		window.addEventListener('pointercancel', onUp, true);
	}, { passive: false });

	// Bottom-right: pull to the LEFT to go to next.
	if (right) right.addEventListener('pointerdown', (e) => {
		if (!e || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		const startX = e.clientX;
		const onUp = (ev) => {
			window.removeEventListener('pointerup', onUp, true);
			window.removeEventListener('pointercancel', onUp, true);
			const dx = (ev && typeof ev.clientX === 'number') ? (startX - ev.clientX) : 0;
			if (dx >= THRESH) triggerNav(right.dataset.target);
		};
		window.addEventListener('pointerup', onUp, true);
		window.addEventListener('pointercancel', onUp, true);
	}, { passive: false });
})();

/** Kontakt + iPad/tablet landskab/portræt: lås dokument-scroll (touch/wheel) og fjern ødelagt inline --vh. */
(function mskContactIpadLandscapeNoScroll() {
	function isContactPage() {
		return (
			document.body &&
			document.body.classList &&
			document.body.classList.contains('contact-sketchbook-page')
		);
	}
	function isLandscapeLock() {
		try {
			if (!window.matchMedia) return false;
			if (!window.matchMedia('(min-width: 1024px) and (max-width: 1366px)').matches) return false;
			return (
				window.matchMedia('(orientation: landscape)').matches ||
				window.matchMedia('(min-aspect-ratio: 1/1)').matches
			);
		} catch {
			return false;
		}
	}
	function isPortraitLock() {
		try {
			if (!window.matchMedia) return false;
			if (!window.matchMedia('(min-width: 641px) and (max-width: 1366px)').matches) return false;
			if (!window.matchMedia('(orientation: portrait)').matches) return false;
			return !isLandscapeLock();
		} catch {
			return false;
		}
	}
	function isLockViewport() {
		return isLandscapeLock() || isPortraitLock();
	}
	function applyLock() {
		if (!isContactPage()) return;
		const landscapeOn = isLandscapeLock();
		const portraitOn = isPortraitLock();
		const on = landscapeOn || portraitOn;
		const root = document.documentElement;
		const body = document.body;
		root.classList.toggle('msk-contact-ipad-landscape-no-scroll', landscapeOn);
		root.classList.toggle('msk-contact-ipad-portrait-no-scroll', portraitOn);
		if (on) {
			root.style.removeProperty('--vh');
			root.style.removeProperty('--vw');
			root.style.overflow = 'hidden';
			root.style.height = '100%';
			root.style.maxHeight = '100%';
			root.style.position = 'fixed';
			root.style.width = '100%';
			root.style.inset = '0';
			body.style.overflow = 'hidden';
			body.style.height = '100%';
			body.style.maxHeight = '100%';
			body.style.position = 'fixed';
			body.style.width = '100%';
			body.style.inset = '0';
		} else {
			['overflow', 'height', 'maxHeight', 'position', 'width', 'inset'].forEach((prop) => {
				root.style[prop] = '';
				body.style[prop] = '';
			});
		}
	}
	function blockScroll(e) {
		if (!isContactPage() || !isLockViewport()) return;
		if (mskAllowBrowserZoomGesture(e)) return;
		if (mskIsBrowserPageZoomed()) return;
		e.preventDefault();
	}
	applyLock();
	window.addEventListener('resize', applyLock);
	window.addEventListener('orientationchange', function () {
		window.setTimeout(applyLock, 50);
	});
	document.addEventListener('DOMContentLoaded', applyLock);
	window.addEventListener(
		'touchmove',
		blockScroll,
		{ passive: false, capture: true }
	);
	window.addEventListener('wheel', blockScroll, { passive: false, capture: true });
})();

/** Projekter + iPad/tablet landskab: lås dokument-scroll (som kontakt). */
(function mskProjectsIpadLandscapeNoScroll() {
	function isProjectsPage() {
		return (
			document.body &&
			document.body.classList &&
			document.body.classList.contains('projects-page') &&
			document.body.classList.contains('sketchbook-theme')
		);
	}
	function isLandscapeLock() {
		try {
			if (!window.matchMedia) return false;
			if (!window.matchMedia('(min-width: 1024px) and (max-width: 1366px)').matches) return false;
			return (
				window.matchMedia('(orientation: landscape)').matches ||
				window.matchMedia('(min-aspect-ratio: 1/1)').matches
			);
		} catch {
			return false;
		}
	}
	function scheduleMindmapRelayoutAfterLock() {
		try {
			if (typeof window.mskProjectsMindmapRelayoutAfterTabletOrientation === 'function') {
				window.mskProjectsMindmapRelayoutAfterTabletOrientation(true);
			} else if (typeof window.__mskProjectsRelayout === 'function') {
				window.__mskProjectsRelayout(true);
			}
		} catch (_) {}
	}
	function applyLock() {
		if (!isProjectsPage()) return;
		const on = mskApplyProjectsIpadLandscapeDocumentMode();
		if (on) {
			document.documentElement.style.removeProperty('--vh');
			document.documentElement.style.removeProperty('--vw');
			scheduleMindmapRelayoutAfterLock();
		}
	}
	function blockScroll(e) {
		if (!isProjectsPage()) return;
		try {
			if (
				mskIsProjectsTabletLandscapeViewport() ||
				mskIsProjectsPhonePortraitViewport()
			) {
				if (mskAllowBrowserZoomGesture(e)) return;
				if (mskIsBrowserPageZoomed()) return;
				e.preventDefault();
			}
		} catch (_) {}
	}
	function applyLockAfterReady() {
		applyLock();
	}
	window.addEventListener('resize', applyLock);
	window.addEventListener('orientationchange', function () {
		window.setTimeout(function () {
			applyLock();
			try {
				if (typeof window.mskProjectsMindmapRelayoutAfterTabletOrientation === 'function') {
					window.mskProjectsMindmapRelayoutAfterTabletOrientation(true);
				}
			} catch (_) {}
		}, 50);
		window.setTimeout(function () {
			try {
				if (typeof window.mskProjectsMindmapRelayoutAfterTabletOrientation === 'function') {
					window.mskProjectsMindmapRelayoutAfterTabletOrientation(true);
				}
			} catch (_) {}
		}, 320);
	});
	document.addEventListener('DOMContentLoaded', () => {
		window.setTimeout(applyLockAfterReady, 0);
	});
	window.addEventListener(
		'touchmove',
		blockScroll,
		{ passive: false, capture: true }
	);
	window.addEventListener('wheel', blockScroll, { passive: false, capture: true });
})();

/** Når siden er zoomet: tillad pan/scroll (html-klasse til CSS). */
(function mskBrowserZoomPanMode() {
	function sync() {
		mskSyncBrowserZoomPanMode();
	}
	sync();
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', sync, { passive: true });
		window.visualViewport.addEventListener('scroll', sync, { passive: true });
	}
	window.addEventListener('resize', sync, { passive: true });
	window.addEventListener('orientationchange', () => window.setTimeout(sync, 50), { passive: true });
	document.addEventListener('DOMContentLoaded', sync);
})();

/* Fjernet mskProjectsIpadLandscapeMindmapBoot + mskProjectsMindmapGuaranteedRunner — gav blink ved refresh. */
