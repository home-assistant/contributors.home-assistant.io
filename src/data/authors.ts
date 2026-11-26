// The blog authors and their GitHub usernames, by the name used in `authors`
// in the front matter of a post.
//
// Their avatars are downloaded to public/images/authors/ by `pnpm avatars`,
// so the blog does not load images from GitHub. Writing your first post? Add
// your name and GitHub username here, then run `pnpm avatars`. An author
// without a username gets their initial instead.

export const AUTHORS: Record<string, string> = {
  "Abílio Costa": "abmantis",
  "Aidan Timson": "timmo001",
  "Allen Porter": "allenporter",
  "Artur Pragacz": "arturpragacz",
  "Bram Kragten": "bramkragten",
  "Davide Perteghella": "krahabb",
  "Erik Montnémery": "emontnemery",
  "Erwin Douna": "erwindouna",
  "Franck Nijhof": "frenck",
  "G Johansson": "gjohansson-ST",
  "J. Nick Koston": "bdraco",
  "Jakob Schlyter": "jschlyter",
  "Jan Bouwhuis": "jbouwh",
  "Jan Čermák": "sairon",
  "Jan-Philipp Benecke": "jpbede",
  "Joakim Plate": "elupus",
  "Joakim Sørensen": "ludeeus",
  "John Carr": "Jc2k",
  "Joost Lekkerkerker": "joostlek",
  "Josef Zweck": "zweckj",
  "Ludovic Boué": "lboue",
  "Marc Mueller": "cdce8p",
  "Martin Hjelmare": "MartinHjelmare",
  "Michael Arthur": "mikey0000",
  "Michael Hansen": "synesthesiam",
  "Mike Degatano": "mdegat01",
  "Nikita Nikishin": "puddly",
  "Pascal Vizeli": "pvizeli",
  "Paul Bottein": "piitaya",
  "Paulus Schoutsen": "balloob",
  "Robert Resch": "edenhaus",
  "Sergey Dudanov": "dudanov",
  "Shay Levy": "thecode",
  "Simone Chemelli": "chemelli74",
  "Stefan Agner": "agners",
  "Tomer": "tomer-w",
  "Wendelin Peleska": "wendevlin",
  "Will Moss": "wmoss",
  "Zack Barett": "zsarnett",
  "davet2001": "davet2001",
  "epenet": "epenet",
  "tr4nt0r": "tr4nt0r",
  "iluvdata": "iluvdata"
};

/** The path of an author's avatar in public/, like /images/authors/frenck.png. */
export function authorAvatar(name: string): string | undefined {
  const username = AUTHORS[name];
  return username ? `/images/authors/${username.toLowerCase()}.png` : undefined;
}
