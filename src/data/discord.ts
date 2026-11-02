// The places on the Home Assistant Discord server that the docs point to.
// This is the one place their URLs live.
//
// Pages mention a channel by its name in bold, like **#core**. The build
// turns that into a link to the channel (see src/lib/discord-links.mjs).
// Places without such a name, like the project forum, are linked by their
// id instead: [project forum](discord:project-forum).
//
// A link to a channel only works for people who joined the server. So
// wherever a page first sends readers to Discord, keep the invite link,
// https://www.home-assistant.io/join-chat/, next to it.

export interface DiscordChannel {
  // Used in links, like discord:developers.
  id: string;
  // The name pages write in bold, with its #. Only for channels the pages
  // mention by name.
  name?: string;
  url: string;
  // What the channel is for, in a few words.
  purpose: string;
}

const SERVER = "https://discord.com/channels/330944238910963714";

export const DISCORD_CHANNELS: DiscordChannel[] = [
  {
    id: "building-in-the-open",
    url: `${SERVER}/1257022408385237072`,
    purpose: "Announcements for contributors: what is happening in the project",
  },
  {
    id: "coding-support",
    name: "#coding-support",
    url: `${SERVER}/1257019582112334014`,
    purpose: "General coding support, when you are stuck",
  },
  {
    id: "android-project",
    url: `${SERVER}/1346948551892009101`,
    purpose: "The Android app project thread",
  },
  {
    id: "device-database",
    url: `${SERVER}/1463602457924997236`,
    purpose: "The device database project",
  },
  {
    id: "project-forum",
    url: `${SERVER}/1346914401508392980`,
    purpose: "Longer running projects, and bigger topics the team is sprinting on",
  },
  { id: "developers", name: "#developers", url: `${SERVER}/554842238073700352`, purpose: "General development" },
  { id: "core", name: "#core", url: `${SERVER}/1475552721515053268`, purpose: "Discussions of the core team about Core" },
  { id: "frontend", name: "#frontend", url: `${SERVER}/1475552784278360176`, purpose: "The frontend" },
  {
    id: "operating-system",
    name: "#operating-system",
    url: `${SERVER}/1475552965954900018`,
    purpose: "Home Assistant OS, and the Supervisor",
  },
  { id: "apple-apps", name: "#apple-apps", url: `${SERVER}/1481713628553019392`, purpose: "The Apple apps" },
  { id: "designers", name: "#designers", url: `${SERVER}/1463606665311158284`, purpose: "Design" },
  {
    id: "product-and-ux",
    name: "#product-and-ux",
    url: `${SERVER}/1475553148847526123`,
    purpose: "Product and UX discussions",
  },
  {
    id: "user-researchers",
    name: "#user-researchers",
    url: `${SERVER}/1518940566576959618`,
    purpose: "User research",
  },
  {
    id: "documentation",
    name: "#documentation",
    url: `${SERVER}/1475552849835458691`,
    purpose: "The documentation",
  },
  {
    id: "language-leaders",
    name: "#language-leaders",
    url: `${SERVER}/1257022942961991781`,
    purpose: "Language leaders",
  },
  { id: "beta", name: "#beta", url: `${SERVER}/427516175237382144`, purpose: "Beta releases" },
];
