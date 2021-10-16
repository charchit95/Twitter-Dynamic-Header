// step 1
const dotenv = require("dotenv");
dotenv.config();
const { TwitterClient } = require("twitter-api-client");
const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");

// step 2
const twitterClient = new TwitterClient({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessTokenSecret: process.env.ACCESS_SECRET,
});

// step 3
async function get_followers() {
  try {
    var followers = await twitterClient.accountsAndUsers.followersList({
      count: 3,
    })
  } catch (error) {
    console.log("ERROR in GET FOLLOWERS")
    console.log(error)
  }

  const image_data = [];
  let count = 0;

  const get_followers_img = new Promise((resolve, reject) => {
    followers.users.forEach((follower, index, arr) => {
      process_image(
        follower.profile_image_url_https,
        `${follower.screen_name}.png`
      )
        .then(() => {
          const follower_avatar = {
            input: `${follower.screen_name}.png`,
            top: 310,
            left: parseInt(`${1140 + 120 * index}`),
          };
          image_data.push(follower_avatar);
          count++;
          if (count === arr.length) resolve();
        })
        .catch((error) => {
          console.log("############ ERROR IN GET FOLLOWERS IMAGE ############");
          console.log(error);
        });
    });
  });

  async function process_image(url, image_path) {
    await axios({
      url,
      responseType: "arraybuffer",
    })
      .then(
        (response) =>
          new Promise((resolve, reject) => {
            const rounded_corners = new Buffer.from(
              '<svg><rect x="0" y="0" width="90" height="90" rx="50" ry="50"/></svg>'
            );
            resolve(
              sharp(response.data)
                .resize(90, 90)
                .composite([
                  {
                    input: rounded_corners,
                    blend: "dest-in",
                  },
                ])
                .png()
                .toFile(image_path)
            );
          })
      )
      .catch((error) => {
        console.log("############ ERROR IN PROCESSING IMAGE ############");
        console.log(error);
      });
  }

  get_followers_img.then(() => {
    draw_image(image_data);
  });

  async function draw_image(image_data) {
    try {
      const hour = new Date().getHours();

      if ((hour < 7 && hour >= 5) || (hour < 20 && hour >= 18)) {
        // Sun Rise/Set
        await sharp("sunset.png")
          .composite(image_data)
          .toFile("new-twitter-banner.png");
      } else if (hour < 18 && hour >= 7) {
        // Day
        await sharp("day.png")
          .composite(image_data)
          .toFile("new-twitter-banner.png");
      } else {
        // Night
        await sharp("night.png")
          .composite(image_data)
          .toFile("new-twitter-banner.png");
      }

      // upload banner to twitter
      upload_banner(image_data);
    } catch (error) {
      console.log("############ ERROR IN DRAWING IMAGE ############");
      console.log(error);
    }
  }
}

async function upload_banner(files) {
  try {
    const base64 = await fs.readFileSync("new-twitter-banner.png", {
      encoding: "base64",
    });
    await twitterClient.accountsAndUsers
      .accountUpdateProfileBanner({
        banner: base64,
      })
      .then(() => {
        delete_files(files);
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.log("############ ERROR IN UPLOADING IMAGE ############");
    console.log(error);
  }
}

async function delete_files(files) {
  try {
    files.forEach((file) => {
      if (file.input.includes(".png")) {
        fs.unlinkSync(file.input);
      }
    });
  } catch (err) {
    console.log("############ ERROR IN DELETING FILES ############");
    console.error(err);
  }
}

// call function
// get_followers();

setInterval(() => {
  get_followers();
  console.log("TRIGGERED")
  console.log(new Date().getHours())
}, 60000);

// async function get_followers2() {
//   const followers = await twitterClient.accountsAndUsers.followersList({
//     count: 3,
//   });

//   console.log(followers);
// }