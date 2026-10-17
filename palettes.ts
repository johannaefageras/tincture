// Palette sets for the palette grid.
// Every family keeps the same order as the original: [darker, default, tint].
// "Black and white" is always [black-ish, white-ish].

export type PaletteFamily = { name: string; colors: string[] };

export type PaletteSet = {
	id: string;
	name: string;
	description: string;
	families: PaletteFamily[];
};

export const paletteSets: PaletteSet[] = [
	{
		id: 'default',
		name: 'Crayon Box',
		description: 'The original palette. Clear, classic colors straight from the box.',
		families: [
			{ name: 'Black and white', colors: ['#000000', '#FFFFFF'] },
			{ name: 'Red', colors: ['#8A2020', '#BC3A3A', '#E07A76'] },
			{ name: 'Orange', colors: ['#C96A12', '#F59A2E', '#FFCB80'] },
			{ name: 'Yellow', colors: ['#D19A0C', '#FFC612', '#FFE48A'] },
			{ name: 'Green', colors: ['#579A27', '#7CCB45', '#B4E48C'] },
			{ name: 'Blue', colors: ['#0B5FA5', '#0A84C9', '#58B8E8'] },
			{ name: 'Purple', colors: ['#6235A8', '#8660C9', '#B7A1E6'] },
			{ name: 'Pink', colors: ['#B02E6C', '#E0569A', '#F4A3C8'] },
			{ name: 'Brown', colors: ['#A0622A', '#C48444', '#DDAA78'] },
			{ name: 'Light gray', colors: ['#8A8A8A', '#BDBDBD', '#E6E6E6'] },
			{ name: 'Dark gray', colors: ['#2B2B2B', '#4A4A4A', '#6E6E6E'] }
		]
	},
	{
		id: 'pastel',
		name: 'Sorbet',
		description: 'Soft and airy. Off-black and warm white instead of pure values.',
		families: [
			{ name: 'Black and white', colors: ['#3A3640', '#FFFBF5'] },
			{ name: 'Red', colors: ['#C25B5B', '#E88E8A', '#F7C6C2'] },
			{ name: 'Orange', colors: ['#D9844A', '#F6AE78', '#FCD9BC'] },
			{ name: 'Yellow', colors: ['#D4AE3F', '#F6DC7E', '#FBEFC0'] },
			{ name: 'Green', colors: ['#6FA77A', '#9CCFA4', '#CDEBD0'] },
			{ name: 'Blue', colors: ['#5B8FC7', '#8DB9E6', '#C6DDF4'] },
			{ name: 'Purple', colors: ['#8A72C2', '#B3A0E0', '#DDD2F3'] },
			{ name: 'Pink', colors: ['#C9699A', '#EE9CC4', '#F9CFE2'] },
			{ name: 'Brown', colors: ['#9E7A5C', '#C4A184', '#E3CDB8'] },
			{ name: 'Light gray', colors: ['#A8A4AE', '#CFCCD4', '#ECEAEF'] },
			{ name: 'Dark gray', colors: ['#4E4A55', '#6B6772', '#8C8893'] }
		]
	},
	{
		id: 'vivid',
		name: 'Sticker Sheet',
		description: 'Maximum saturation. Glossy sticker and pop-art energy.',
		families: [
			{ name: 'Black and white', colors: ['#000000', '#FFFFFF'] },
			{ name: 'Red', colors: ['#B5001F', '#FF1F3D', '#FF8A97'] },
			{ name: 'Orange', colors: ['#D14800', '#FF6B00', '#FFAA66'] },
			{ name: 'Yellow', colors: ['#D9AA00', '#FFE100', '#FFF27A'] },
			{ name: 'Green', colors: ['#00963F', '#00D35B', '#7CF5A8'] },
			{ name: 'Blue', colors: ['#0038C7', '#1F6BFF', '#85AEFF'] },
			{ name: 'Purple', colors: ['#5A00C7', '#8A2BFF', '#C39CFF'] },
			{ name: 'Pink', colors: ['#C2006E', '#FF2D9B', '#FF94CC'] },
			{ name: 'Brown', colors: ['#7A3B12', '#A85A24', '#D69462'] },
			{ name: 'Light gray', colors: ['#9A9A9A', '#C8C8C8', '#EDEDED'] },
			{ name: 'Dark gray', colors: ['#1F1F1F', '#3A3A3A', '#5C5C5C'] }
		]
	},
	{
		id: 'earthy',
		name: 'Potting Shed',
		description: 'Earthy and warm. Terracotta, ochre, olive, slate, stone grays.',
		families: [
			{ name: 'Black and white', colors: ['#1E1A16', '#F4EEE3'] },
			{ name: 'Red', colors: ['#7A2E22', '#A8483A', '#D08A7C'] },
			{ name: 'Orange', colors: ['#A65A25', '#CF7E3E', '#E8B488'] },
			{ name: 'Yellow', colors: ['#A87D1E', '#D1A645', '#E8D08F'] },
			{ name: 'Green', colors: ['#4F5E2E', '#728445', '#A9B887'] },
			{ name: 'Blue', colors: ['#2F4F5E', '#4A7385', '#8FAEBB'] },
			{ name: 'Purple', colors: ['#4E3A52', '#6E5774', '#A898AC'] },
			{ name: 'Pink', colors: ['#9A5560', '#C07B84', '#DEB2B6'] },
			{ name: 'Brown', colors: ['#5C3D24', '#86603D', '#B99572'] },
			{ name: 'Light gray', colors: ['#A39C90', '#C9C2B6', '#E6E1D8'] },
			{ name: 'Dark gray', colors: ['#2E2A25', '#47423B', '#665F56'] }
		]
	},
	{
		id: 'nordic',
		name: 'Lingonberry',
		description: 'Cool and muted, Nordic style. Berry red, pine, fjord, heather.',
		families: [
			{ name: 'Black and white', colors: ['#1C2126', '#F7F8F6'] },
			{ name: 'Red', colors: ['#8E2F3C', '#B5495A', '#DB9AA3'] },
			{ name: 'Orange', colors: ['#B0663A', '#D48A5A', '#ECBD9C'] },
			{ name: 'Yellow', colors: ['#B8962E', '#DDBB55', '#EEDC9F'] },
			{ name: 'Green', colors: ['#3F6B57', '#5E8F78', '#A2C4B2'] },
			{ name: 'Blue', colors: ['#2E4F73', '#4E7399', '#9BB6D1'] },
			{ name: 'Purple', colors: ['#584B7A', '#7B6EA0', '#B8AFD0'] },
			{ name: 'Pink', colors: ['#A3586F', '#C77F94', '#E6B8C5'] },
			{ name: 'Brown', colors: ['#7A5A43', '#9E7C62', '#C9AF99'] },
			{ name: 'Light gray', colors: ['#9AA2A8', '#C4CBD0', '#E4E8EB'] },
			{ name: 'Dark gray', colors: ['#262C31', '#3E464D', '#5F686F'] }
		]
	},
	{
		id: 'jewel',
		name: 'Velvet',
		description: 'Deep and rich. Ruby, emerald, sapphire, amethyst, gold.',
		families: [
			{ name: 'Black and white', colors: ['#0D0B12', '#FBF8F2'] },
			{ name: 'Red', colors: ['#6E0F1E', '#9B1B30', '#D05A6B'] },
			{ name: 'Orange', colors: ['#8F3A08', '#C25A12', '#E8955A'] },
			{ name: 'Yellow', colors: ['#9C7400', '#D4A017', '#EED27A'] },
			{ name: 'Green', colors: ['#0B4F3A', '#137A58', '#5DBF97'] },
			{ name: 'Blue', colors: ['#0E2C6B', '#1A47A3', '#6B8EDB'] },
			{ name: 'Purple', colors: ['#3D1263', '#5E2192', '#A27DD1'] },
			{ name: 'Pink', colors: ['#7A0F4D', '#B01E72', '#E06FAA'] },
			{ name: 'Brown', colors: ['#4A2612', '#71401F', '#AD7A54'] },
			{ name: 'Light gray', colors: ['#8C8996', '#B9B6C2', '#E2E0E7'] },
			{ name: 'Dark gray', colors: ['#1C1A22', '#33303B', '#4F4B58'] }
		]
	},
	{
		id: 'retro',
		name: "Kitchen '74",
		description: 'Retro seventies. Harvest gold, avocado, teal, cream.',
		families: [
			{ name: 'Black and white', colors: ['#2A1F17', '#FBF1DC'] },
			{ name: 'Red', colors: ['#8E2C1C', '#C4452C', '#E58A72'] },
			{ name: 'Orange', colors: ['#B85A10', '#E07B1F', '#F5B26E'] },
			{ name: 'Yellow', colors: ['#C28E0E', '#EDB821', '#F7DC86'] },
			{ name: 'Green', colors: ['#5E6B1A', '#879A2C', '#C0CC7E'] },
			{ name: 'Blue', colors: ['#1F5E6E', '#2F8799', '#86C0CB'] },
			{ name: 'Purple', colors: ['#5A3466', '#7E4F8C', '#BB9AC4'] },
			{ name: 'Pink', colors: ['#B04A5E', '#D9708A', '#F0B0BD'] },
			{ name: 'Brown', colors: ['#5E3418', '#8B5229', '#C08D62'] },
			{ name: 'Light gray', colors: ['#A69C8C', '#CBC2B2', '#E8E1D3'] },
			{ name: 'Dark gray', colors: ['#3A3029', '#544840', '#776A5F'] }
		]
	},
	{
		id: 'riso',
		name: 'Fresh Ink',
		description: 'Risograph-ink inspired. Bright, slightly chalky, newsprint white.',
		families: [
			{ name: 'Black and white', colors: ['#1A1A1A', '#F4F1EA'] },
			{ name: 'Red', colors: ['#B8323E', '#F15060', '#F89DA5'] },
			{ name: 'Orange', colors: ['#C4501F', '#FF6C2F', '#FFB08E'] },
			{ name: 'Yellow', colors: ['#D1B800', '#FFE800', '#FFF38A'] },
			{ name: 'Green', colors: ['#007A42', '#00A95C', '#76D6A3'] },
			{ name: 'Blue', colors: ['#00558A', '#0078BF', '#6FB4E0'] },
			{ name: 'Purple', colors: ['#54407D', '#765BA7', '#B3A3D3'] },
			{ name: 'Pink', colors: ['#D4268A', '#FF48B0', '#FFA3D6'] },
			{ name: 'Brown', colors: ['#6B433A', '#925F52', '#C49B90'] },
			{ name: 'Light gray', colors: ['#9C9993', '#C7C4BD', '#E6E3DC'] },
			{ name: 'Dark gray', colors: ['#2E2D2B', '#4A4846', '#6E6B68'] }
		]
	},
	{
		id: 'tropical',
		name: 'Fruit Salad',
		description: 'Warm and juicy. Coral, mango, lime, turquoise, sand grays.',
		families: [
			{ name: 'Black and white', colors: ['#1B2A2F', '#FFFAF0'] },
			{ name: 'Red', colors: ['#B8302A', '#F2544B', '#FF9E94'] },
			{ name: 'Orange', colors: ['#D66A0F', '#FF9A1F', '#FFC979'] },
			{ name: 'Yellow', colors: ['#D9B500', '#FFDD2E', '#FFF09A'] },
			{ name: 'Green', colors: ['#4E8F12', '#8CCB1E', '#CDEB82'] },
			{ name: 'Blue', colors: ['#00788A', '#00B3C7', '#7FDDE8'] },
			{ name: 'Purple', colors: ['#7A2E8E', '#A84DBF', '#D99BE6'] },
			{ name: 'Pink', colors: ['#D93F68', '#FF6F91', '#FFB3C4'] },
			{ name: 'Brown', colors: ['#7A4A22', '#A86B35', '#D9A774'] },
			{ name: 'Light gray', colors: ['#A8A196', '#D1CBC0', '#EEEAE2'] },
			{ name: 'Dark gray', colors: ['#25343A', '#3D4E55', '#627378'] }
		]
	},
	{
		id: 'dusk',
		name: 'Blue Hour',
		description: 'Twilight filter. Every hue leans toward violet, lavender grays.',
		families: [
			{ name: 'Black and white', colors: ['#1A1428', '#F6F1FA'] },
			{ name: 'Red', colors: ['#7A1F45', '#B03A63', '#DE8AA5'] },
			{ name: 'Orange', colors: ['#A8443F', '#E07A68', '#F5B7A6'] },
			{ name: 'Yellow', colors: ['#C2924A', '#F0C27A', '#F9E2BC'] },
			{ name: 'Green', colors: ['#2B5E5E', '#4A8C88', '#9CC7C2'] },
			{ name: 'Blue', colors: ['#1F3770', '#3D5CA8', '#8FA3DB'] },
			{ name: 'Purple', colors: ['#3E2A7A', '#6248B0', '#A896E0'] },
			{ name: 'Pink', colors: ['#A8458F', '#D477B8', '#F0B8DF'] },
			{ name: 'Brown', colors: ['#5A3A40', '#82585C', '#B8949A'] },
			{ name: 'Light gray', colors: ['#9C97AB', '#C6C1D3', '#E6E2EE'] },
			{ name: 'Dark gray', colors: ['#25213A', '#3B3652', '#5C5772'] }
		]
	}
];
