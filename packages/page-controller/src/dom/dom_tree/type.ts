// FlatDomTree: Flattened DOM tree structure, suitable for efficient storage and traversal of page structure.
// Each node is indexed via map, supports both text nodes and element nodes; fields distinguish between undefined and false.

export interface FlatDomTree {
	rootId: string
	map: Record<string, DomNode>
}

export type DomNode = TextDomNode | ElementDomNode | InteractiveElementDomNode

export interface TextDomNode {
	type: 'TEXT_NODE'
	text: string
	isVisible: boolean
	// Other optional fields
	[key: string]: unknown
}

export interface ElementDomNode {
	tagName: string
	attributes?: Record<string, string>
	xpath?: string
	children?: string[]
	isVisible?: boolean
	isTopElement?: boolean
	isInViewport?: boolean
	isNew?: boolean
	isInteractive?: false
	highlightIndex?: number
	extra?: Record<string, any>
	// Other optional fields
	[key: string]: unknown
}

export interface InteractiveElementDomNode {
	tagName: string
	attributes?: Record<string, string>
	xpath?: string
	children?: string[]
	isVisible?: boolean
	isTopElement?: boolean
	isInViewport?: boolean
	isInteractive: true
	highlightIndex: number
	/**
	 * DOM reference of the interactive element
	 */
	ref: HTMLElement
	// Other optional fields
	[key: string]: unknown
}
