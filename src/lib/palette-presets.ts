// Palette sets for the palette grid.
// Every family has five shades, lightest first: [1, 2, 3 = default, 4, 5].
// Colored families: 2 and 4 are the original tint and dark shade, 1 and 5 extend the range.
// Light gray and Dark gray fill in between their original shades instead, so the two
// gray ramps don't collide with each other or with black and white.
// "Black and white" is [white-ish, black-ish].

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
			{ name: 'Black and white', colors: ['#FFFFFF', '#000000'] },
			{ name: 'Red', colors: ['#FFBBB6', '#E07A76', '#BC3A3A', '#8A2020', '#5C0208'] },
			{ name: 'Orange', colors: ['#FFE5C2', '#FFCB80', '#F59A2E', '#C96A12', '#904802'] },
			{ name: 'Yellow', colors: ['#FFF1C1', '#FFE48A', '#FFC612', '#D19A0C', '#9F7402'] },
			{ name: 'Green', colors: ['#D1F6B4', '#B4E48C', '#7CCB45', '#579A27', '#366B04'] },
			{ name: 'Blue', colors: ['#A8DFFE', '#58B8E8', '#0A84C9', '#0B5FA5', '#014075'] },
			{ name: 'Purple', colors: ['#DDCFFE', '#B7A1E6', '#8660C9', '#6235A8', '#3F1078'] },
			{ name: 'Pink', colors: ['#FED1E4', '#F4A3C8', '#E0569A', '#B02E6C', '#7E0247'] },
			{ name: 'Brown', colors: ['#FAD2AD', '#DDAA78', '#C48444', '#A0622A', '#79440F'] },
			{ name: 'Light gray', colors: ['#E6E6E6', '#D1D1D1', '#BDBDBD', '#A3A3A3', '#8A8A8A'] },
			{ name: 'Dark gray', colors: ['#6E6E6E', '#5C5C5C', '#4A4A4A', '#3A3A3A', '#2B2B2B'] }
		]
	},
	{
		id: 'pastel',
		name: 'Sorbet',
		description: 'Soft and airy. Off-black and warm white instead of pure values.',
		families: [
			{ name: 'Black and white', colors: ['#FFFBF5', '#3A3640'] },
			{ name: 'Red', colors: ['#FEE1DE', '#F7C6C2', '#E88E8A', '#C25B5B', '#8E3638'] },
			{ name: 'Orange', colors: ['#FFEADA', '#FCD9BC', '#F6AE78', '#D9844A', '#AD6431'] },
			{ name: 'Yellow', colors: ['#F8F5E7', '#FBEFC0', '#F6DC7E', '#D4AE3F', '#A7861F'] },
			{ name: 'Green', colors: ['#E3F5E4', '#CDEBD0', '#9CCFA4', '#6FA77A', '#4D7E57'] },
			{ name: 'Blue', colors: ['#DDEEFF', '#C6DDF4', '#8DB9E6', '#5B8FC7', '#3A6797'] },
			{ name: 'Purple', colors: ['#EEE6FF', '#DDD2F3', '#B3A0E0', '#8A72C2', '#624C90'] },
			{ name: 'Pink', colors: ['#FFE5F0', '#F9CFE2', '#EE9CC4', '#C9699A', '#96446F'] },
			{ name: 'Brown', colors: ['#F5E4D4', '#E3CDB8', '#C4A184', '#9E7A5C', '#75573D'] },
			{ name: 'Light gray', colors: ['#ECEAEF', '#DDDBE1', '#CFCCD4', '#BBB8C1', '#A8A4AE'] },
			{ name: 'Dark gray', colors: ['#8C8893', '#7B7782', '#6B6772', '#5C5863', '#4E4A55'] }
		]
	},
	{
		id: 'vivid',
		name: 'Sticker Sheet',
		description: 'Maximum saturation. Glossy sticker and pop-art energy.',
		families: [
			{ name: 'Black and white', colors: ['#FFFFFF', '#000000'] },
			{ name: 'Red', colors: ['#FECACD', '#FF8A97', '#FF1F3D', '#B5001F', '#6D020F'] },
			{ name: 'Orange', colors: ['#FED7BA', '#FFAA66', '#FF6B00', '#D14800', '#9B3402'] },
			{ name: 'Yellow', colors: ['#FFF8B2', '#FFF27A', '#FFE100', '#D9AA00', '#A27F06'] },
			{ name: 'Green', colors: ['#B6FFCC', '#7CF5A8', '#00D35B', '#00963F', '#066329'] },
			{ name: 'Blue', colors: ['#C5D8FE', '#85AEFF', '#1F6BFF', '#0038C7', '#001C6E'] },
			{ name: 'Purple', colors: ['#E1D0FF', '#C39CFF', '#8A2BFF', '#5A00C7', '#340479'] },
			{ name: 'Pink', colors: ['#FFCEE5', '#FF94CC', '#FF2D9B', '#C2006E', '#800447'] },
			{ name: 'Brown', colors: ['#FBC7A1', '#D69462', '#A85A24', '#7A3B12', '#4E1F00'] },
			{ name: 'Light gray', colors: ['#EDEDED', '#DADADA', '#C8C8C8', '#B1B1B1', '#9A9A9A'] },
			{ name: 'Dark gray', colors: ['#5C5C5C', '#4B4B4B', '#3A3A3A', '#2C2C2C', '#1F1F1F'] }
		]
	},
	{
		id: 'earthy',
		name: 'Potting Shed',
		description: 'Earthy and warm. Terracotta, ochre, olive, slate, stone grays.',
		families: [
			{ name: 'Black and white', colors: ['#F4EEE3', '#1E1A16'] },
			{ name: 'Red', colors: ['#F9C1B5', '#D08A7C', '#A8483A', '#7A2E22', '#521108'] },
			{ name: 'Orange', colors: ['#FED7B7', '#E8B488', '#CF7E3E', '#A65A25', '#7B3B05'] },
			{ name: 'Yellow', colors: ['#F9E7B6', '#E8D08F', '#D1A645', '#A87D1E', '#7B5902'] },
			{ name: 'Green', colors: ['#D2DEB9', '#A9B887', '#728445', '#4F5E2E', '#2F3B10'] },
			{ name: 'Blue', colors: ['#C1D9E3', '#8FAEBB', '#4A7385', '#2F4F5E', '#122E3B'] },
			{ name: 'Purple', colors: ['#D8CBDB', '#A898AC', '#6E5774', '#4E3A52', '#301F33'] },
			{ name: 'Pink', colors: ['#F8D5D8', '#DEB2B6', '#C07B84', '#9A5560', '#6F353F'] },
			{ name: 'Brown', colors: ['#E6C9AE', '#B99572', '#86603D', '#5C3D24', '#361D06'] },
			{ name: 'Light gray', colors: ['#E6E1D8', '#D7D1C7', '#C9C2B6', '#B6AFA3', '#A39C90'] },
			{ name: 'Dark gray', colors: ['#665F56', '#565048', '#47423B', '#3A3630', '#2E2A25'] }
		]
	},
	{
		id: 'nordic',
		name: 'Lingonberry',
		description: 'Cool and muted, Nordic style. Berry red, pine, fjord, heather.',
		families: [
			{ name: 'Black and white', colors: ['#F7F8F6', '#1C2126'] },
			{ name: 'Red', colors: ['#FCC8CF', '#DB9AA3', '#B5495A', '#8E2F3C', '#681524'] },
			{ name: 'Orange', colors: ['#FFDBC3', '#ECBD9C', '#D48A5A', '#B0663A', '#874820'] },
			{ name: 'Yellow', colors: ['#FAEDBF', '#EEDC9F', '#DDBB55', '#B8962E', '#917411'] },
			{ name: 'Green', colors: ['#CBE4D6', '#A2C4B2', '#5E8F78', '#3F6B57', '#224938'] },
			{ name: 'Blue', colors: ['#C7DCF1', '#9BB6D1', '#4E7399', '#2E4F73', '#112E4C'] },
			{ name: 'Purple', colors: ['#DDD6F0', '#B8AFD0', '#7B6EA0', '#584B7A', '#372B53'] },
			{ name: 'Pink', colors: ['#FBD8E1', '#E6B8C5', '#C77F94', '#A3586F', '#78394D'] },
			{ name: 'Brown', colors: ['#EAD6C5', '#C9AF99', '#9E7C62', '#7A5A43', '#563B27'] },
			{ name: 'Light gray', colors: ['#E4E8EB', '#D4D9DD', '#C4CBD0', '#AFB6BC', '#9AA2A8'] },
			{ name: 'Dark gray', colors: ['#5F686F', '#4E575E', '#3E464D', '#32393F', '#262C31'] }
		]
	},
	{
		id: 'jewel',
		name: 'Velvet',
		description: 'Deep and rich. Ruby, emerald, sapphire, amethyst, gold.',
		families: [
			{ name: 'Black and white', colors: ['#FBF8F2', '#0D0B12'] },
			{ name: 'Red', colors: ['#FEAAB1', '#D05A6B', '#9B1B30', '#6E0F1E', '#46010D'] },
			{ name: 'Orange', colors: ['#FECAA7', '#E8955A', '#C25A12', '#8F3A08', '#5B2000'] },
			{ name: 'Yellow', colors: ['#FDE8A8', '#EED27A', '#D4A017', '#9C7400', '#674C04'] },
			{ name: 'Green', colors: ['#A1E7C7', '#5DBF97', '#137A58', '#0B4F3A', '#01281C'] },
			{ name: 'Blue', colors: ['#B0C9FD', '#6B8EDB', '#1A47A3', '#0E2C6B', '#001042'] },
			{ name: 'Purple', colors: ['#D7BBFD', '#A27DD1', '#5E2192', '#3D1263', '#21003C'] },
			{ name: 'Pink', colors: ['#FEB6D8', '#E06FAA', '#B01E72', '#7A0F4D', '#49012B'] },
			{ name: 'Brown', colors: ['#E5BB9E', '#AD7A54', '#71401F', '#4A2612', '#290C00'] },
			{ name: 'Light gray', colors: ['#E2E0E7', '#CDCBD4', '#B9B6C2', '#A29FAC', '#8C8996'] },
			{ name: 'Dark gray', colors: ['#4F4B58', '#413D49', '#33303B', '#27252E', '#1C1A22'] }
		]
	},
	{
		id: 'retro',
		name: "Kitchen '74",
		description: 'Retro seventies. Harvest gold, avocado, teal, cream.',
		families: [
			{ name: 'Black and white', colors: ['#FBF1DC', '#2A1F17'] },
			{ name: 'Red', colors: ['#FEC4B4', '#E58A72', '#C4452C', '#8E2C1C', '#600C01'] },
			{ name: 'Orange', colors: ['#FFD9B4', '#F5B26E', '#E07B1F', '#B85A10', '#8A4105'] },
			{ name: 'Yellow', colors: ['#FFEDB4', '#F7DC86', '#EDB821', '#C28E0E', '#926A02'] },
			{ name: 'Green', colors: ['#DEE8AE', '#C0CC7E', '#879A2C', '#5E6B1A', '#374002'] },
			{ name: 'Blue', colors: ['#B8E3EC', '#86C0CB', '#2F8799', '#1F5E6E', '#003946'] },
			{ name: 'Purple', colors: ['#E4CAEB', '#BB9AC4', '#7E4F8C', '#5A3466', '#3A1944'] },
			{ name: 'Pink', colors: ['#FFD5DD', '#F0B0BD', '#D9708A', '#B04A5E', '#822A3E'] },
			{ name: 'Brown', colors: ['#EDC5A4', '#C08D62', '#8B5229', '#5E3418', '#381600'] },
			{ name: 'Light gray', colors: ['#E8E1D3', '#D9D1C2', '#CBC2B2', '#B8AF9F', '#A69C8C'] },
			{ name: 'Dark gray', colors: ['#776A5F', '#65594F', '#544840', '#473C34', '#3A3029'] }
		]
	},
	{
		id: 'riso',
		name: 'Fresh Ink',
		description: 'Risograph-ink inspired. Bright, slightly chalky, newsprint white.',
		families: [
			{ name: 'Black and white', colors: ['#F4F1EA', '#1A1A1A'] },
			{ name: 'Red', colors: ['#FFCFD2', '#F89DA5', '#F15060', '#B8323E', '#850820'] },
			{ name: 'Orange', colors: ['#FED9CA', '#FFB08E', '#FF6C2F', '#C4501F', '#8F3204'] },
			{ name: 'Yellow', colors: ['#FFF8BA', '#FFF38A', '#FFE800', '#D1B800', '#9F8D10'] },
			{ name: 'Green', colors: ['#ACF2CA', '#76D6A3', '#00A95C', '#007A42', '#014E28'] },
			{ name: 'Blue', colors: ['#ACDDFE', '#6FB4E0', '#0078BF', '#00558A', '#003458'] },
			{ name: 'Purple', colors: ['#DBCFF5', '#B3A3D3', '#765BA7', '#54407D', '#362458'] },
			{ name: 'Pink', colors: ['#FFD4EA', '#FFA3D6', '#FF48B0', '#D4268A', '#A50A69'] },
			{ name: 'Brown', colors: ['#ECCBC2', '#C49B90', '#925F52', '#6B433A', '#492720'] },
			{ name: 'Light gray', colors: ['#E6E3DC', '#D6D3CC', '#C7C4BD', '#B1AEA8', '#9C9993'] },
			{ name: 'Dark gray', colors: ['#6E6B68', '#5C5957', '#4A4846', '#3C3A38', '#2E2D2B'] }
		]
	},
	{
		id: 'tropical',
		name: 'Fruit Salad',
		description: 'Warm and juicy. Coral, mango, lime, turquoise, sand grays.',
		families: [
			{ name: 'Black and white', colors: ['#FFFAF0', '#1B2A2F'] },
			{ name: 'Red', colors: ['#FED2CC', '#FF9E94', '#F2544B', '#B8302A', '#81060A'] },
			{ name: 'Orange', colors: ['#FFE4BF', '#FFC979', '#FF9A1F', '#D66A0F', '#9D4B06'] },
			{ name: 'Yellow', colors: ['#FFF6C4', '#FFF09A', '#FFDD2E', '#D9B500', '#AE9102'] },
			{ name: 'Green', colors: ['#E1F8AC', '#CDEB82', '#8CCB1E', '#4E8F12', '#305F00'] },
			{ name: 'Blue', colors: ['#AFF3FB', '#7FDDE8', '#00B3C7', '#00788A', '#024A56'] },
			{ name: 'Purple', colors: ['#F5C9FF', '#D99BE6', '#A84DBF', '#7A2E8E', '#510862'] },
			{ name: 'Pink', colors: ['#FFDAE1', '#FFB3C4', '#FF6F91', '#D93F68', '#A71E48'] },
			{ name: 'Brown', colors: ['#F8D1AB', '#D9A774', '#A86B35', '#7A4A22', '#522A03'] },
			{ name: 'Light gray', colors: ['#EEEAE2', '#DFDAD1', '#D1CBC0', '#BCB6AB', '#A8A196'] },
			{ name: 'Dark gray', colors: ['#627378', '#4F6066', '#3D4E55', '#314147', '#25343A'] }
		]
	},
	{
		id: 'dusk',
		name: 'Blue Hour',
		description: 'Twilight filter. Every hue leans toward violet, lavender grays.',
		families: [
			{ name: 'Black and white', colors: ['#F6F1FA', '#1A1428'] },
			{ name: 'Red', colors: ['#FFC0D2', '#DE8AA5', '#B03A63', '#7A1F45', '#4A0224'] },
			{ name: 'Orange', colors: ['#FFDAD0', '#F5B7A6', '#E07A68', '#A8443F', '#721C1B'] },
			{ name: 'Yellow', colors: ['#FAEFDE', '#F9E2BC', '#F0C27A', '#C2924A', '#906726'] },
			{ name: 'Green', colors: ['#C6E6E2', '#9CC7C2', '#4A8C88', '#2B5E5E', '#033535'] },
			{ name: 'Blue', colors: ['#C2D2FE', '#8FA3DB', '#3D5CA8', '#1F3770', '#041343'] },
			{ name: 'Purple', colors: ['#D5CAFE', '#A896E0', '#6248B0', '#3E2A7A', '#20074E'] },
			{ name: 'Pink', colors: ['#FED8F2', '#F0B8DF', '#D477B8', '#A8458F', '#751F61'] },
			{ name: 'Brown', colors: ['#E4C8CC', '#B8949A', '#82585C', '#5A3A40', '#371D22'] },
			{ name: 'Light gray', colors: ['#E6E2EE', '#D6D1E0', '#C6C1D3', '#B1ACBF', '#9C97AB'] },
			{ name: 'Dark gray', colors: ['#5C5772', '#4B4662', '#3B3652', '#302B46', '#25213A'] }
		]
	}
];
