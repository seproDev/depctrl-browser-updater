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
  "petzku/Aegisub-Scripts/stable", // not in depctrl, but added by macros
  "PhosCity/Aegisub-Scripts/main",
  "TypesettingTools/SubInspector/master",
  "TypesettingTools/unanimated-Aegisub-Scripts/master",
  "unanimated/luaegisub/master", // not in depctrl, but added by macros
  "Zahuczky/Zahuczkys-Aegisub-Scripts/main",
  "TypesettingTools/arch1t3cht-Aegisub-Scripts/main",
  "TypesettingTools/zeref-Aegisub-Scripts/main",
  "TypesettingTools/ILL-Aegisub-Scripts/main"
];

const getLastUpdated = async (feed) => {
  const [owner, repo, branch] = feed.split("/");
  const url = `https://github.com/${owner}/${repo}/commits/${branch}/DependencyControl.json.atom`;
  console.log("Fetching repo " + feed);
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        const err = new Error("Not 2xx response");
        err.response = response;
        throw err;
      } else {
        return response.text()
      }
    })
    .then((text) => text.slice(text.indexOf("<updated>") + 9, text.indexOf("</updated>")));
}

const updateFeedTime = async (feed, updateTime, env) => {
  const currentValue = await env.KVSTORAGE.get(feed);
  const resolvedUpdateTime = await updateTime;
  console.log("Feed " + feed + " with old value " + currentValue + " and new value " + resolvedUpdateTime);

  if (currentValue !== resolvedUpdateTime) {
    await env.KVSTORAGE.put(feed, resolvedUpdateTime);
    return true;
  }
  return false;
}

const rebuildSite = async (env, reason = 'unknown') => {
  // Requesting rebuild on Github Pages
  const response = await fetch("https://api.github.com/repos/TypesettingTools/depctrl-browser/dispatches", {
    method: "post",
    headers: new Headers({
      "Authorization": "token " + env.GH_API_TOKEN,
      "Accept": "application/vnd.github+json",
      "User-Agent": "DepCtrl Browser Update Trigger on CF Worker"
    }),
    body: JSON.stringify({ "event_type": "feed-update-detected", "client_payload": { "reason": reason } })
  });
  const results = await response.text();
  console.log(results)
}

export default {
  async scheduled(controller, env, ctx) {
    console.log("Starting scheduled worker");
    // Can't use map due to http request limit?
    var rebuildTriggered = false;
    for (let feed of feeds) {
      const updateTime = await getLastUpdated(feed)
        .catch((err) => {
          console.error(err);
        });
      if (updateTime === undefined) {
        continue;
      }
      const updated = await updateFeedTime(feed, updateTime, env);
      if (updated && !rebuildTriggered) {
        console.log("Feed changed, requesting rebuild");
        await rebuildSite(env, feed);
        rebuildTriggered = true;
      }
    }
  },
};
