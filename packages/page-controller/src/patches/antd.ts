import type { PageController } from '../PageController'

const clearFunctions = [] as (() => void)[]

/**
 * Ant Design's Select uses a div-wrapping-input structure where all data lives on the input element,
 * but that input is invisible and won't appear in the cleaned DOM tree, so we promote it here.
 */
function fixAntdSelect() {
	const selects = [...document.querySelectorAll('input[role="combobox"]')]
	// for (const select of selects) {}
}

export function patchAntd(pageController: PageController) {
	pageController.addEventListener('beforeUpdate', fixAntdSelect)
	pageController.addEventListener('afterUpdate', () => {
		for (const fn of clearFunctions) fn()
		clearFunctions.length = 0
	})
}
