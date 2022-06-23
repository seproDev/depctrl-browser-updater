const feeds = [
  "TypesettingTools/Aegisub-Motion/DepCtrl",
  "TypesettingTools/ASSFoundation/master",
  "TypesettingTools/CoffeeFlux-Aegisub-Scripts/master",
  "TypesettingTools/DependencyControl/master",
  "TypesettingTools/ffi-experiments/master",
  "TypesettingTools/Functional/master",
  "TypesettingTools/line0-Aegisub-Scripts/master",
  "TypesettingTools/lyger-Aegisub-Scripts/master",
  "TypesettingTools/Myaamori-Aegisub-Scripts/master",
  "petzku/Aegisub-Scripts/master",
  "PhosCity/Aegisub-Scripts/main",
  "TypesettingTools/SubInspector/master",
  "TypesettingTools/unanimated-Aegisub-Scripts/master",
  "Zahuczky/Zahuczkys-Aegisub-Scripts/main",
];

const getLastUpdated = (feed) => {
  const [owner, repo, branch] = feed.split("/");
  const url = `https://github.com/${owner}/${repo}/commits/${branch}/DependencyControl.json.atom`;
  return fetch(url)
    .then((response) => response.text())
    .then((text) => text.slice(text.indexOf("<updated>") + 9, text.indexOf("</updated>")));
}

const updateFeedTime = async (feed, updateTime, env) => {
  let id = env.FEEDUPDATED.idFromName(feed);
  let obj = env.FEEDUPDATED.get(id);
  let resolvedFeedTime = await updateTime;

  return obj.fetch("https://depctrl-browser-updater.workers.dev/", { method: "POST", body: resolvedFeedTime })
    .then((response) => response.text())
    .then((updated) => updated === "true");
}

const rebuildSite = async () => {
  // Requesting Cloudfalre rebuild
  const response = await fetch("https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/4d72a3ea-06f8-4f99-ba4d-425f0546e19c", { method: 'POST' });
  const results = response.text();
  console.log(results);
}

export default {
  async scheduled(controller, env, ctx) {
    console.log(`Starting scheduled worker at ${new Date()}`);
    let changed = await feeds.map((feed) => [feed, getLastUpdated(feed)])
      .map(([feed, lastUpdated]) => updateFeedTime(feed, lastUpdated, env))
      .reduce((a, b) => a || b);
    if (changed) {
      console.log("Feed changed, requesting rebuild");
      rebuildSite();
    }
  },
};

// Durable Object
export class FeedUpdated {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {

    let value = (await this.state.storage.get("value")) || "";

    switch (request.method) {
      case "POST":
        let newValue = await request.text();
        if (value !== newValue) {
          await this.state.storage.put("value", newValue);
          return new Response("true");
        } else {
          return new Response("false");
        }
      default:
        return new Response("Not found", { status: 404 });
    }
  }
}
