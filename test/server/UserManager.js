/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import chai from "chai";
const assert = chai.assert;
import http from "chai-http";
chai.use(http);
import { ServerPlatform } from "../../src/server/ServerPlatform.js";
/* global Platform */
global.Platform = ServerPlatform;
import tmp from "tmp-promise";
import sparseEqual from "../sparseEqual.js";

import { Server } from "../../src/server/Server.js";
import { UserManager } from "../../src/server/UserManager.js";

/**
 * Basic unit tests for UserManager class. Only tests Xanado signins.
 */
describe("server/UserManager", () => {

  const config = {
    //debug: "server",
    auth: {
      "db_file" : "delayed"
    },
    game_defaults: {
      edition: "Test",
      dictionary: "Oxford_5000",
      allowTakeBack: true,
      allowUndo: false,
      challengePenalty: "Miss next turn",
      maxPlayers: 0,
      minPlayers: 2,
      penaltyPoints: 5,
      predictScore: true,
      timeAllowed: 0,
      timePenalty: 0
    },
    user_defaults: {
      layout: "default"
    },
    html_dir: "html"
  };

  beforeEach(
    () => {
      return tmp.dir()
      .then(d => UserManager.SESSIONS_DIR = d.path)
      .then(() => tmp.file())
      .then(o => config.auth.db_file = o.path)
      .then(() => tmp.dir())
      .then(o => config.games = o.path)
      .then(() => Platform.i18n().load("en-GB"));
    });

  it("/session when not signed in", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .get("/session")
    .then(res => {
      assert.equal(res.status, 401);
      assert.deepEqual(res.body, ["txt-nosign"]);
    });
  });

  it("/register - bad username", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .post("/register")
    .set('content-type', 'application/x-www-form-urlencoded')
    .send({})
    .then(res => {
      assert.equal(res.status, 403);
      assert.deepEqual(res.body, ["bad-user", null]);
    });
  });

  it("/register - again", () => {
    const details = {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    };

    const server = new Server(config);
    return chai.request(server.express)
    .post("/register")
    .set('content-type', 'application/x-www-form-urlencoded')
    .send(details)
    .then(res => {
      assert.equal(res.status, 200);
      sparseEqual(res.body, {
        name: details.register_username,
        provider: "xanado"
      });
      assert(res.body.key.length > 1);
      assert(!res.body.email);
    })
    .then(() => chai.request(server.express)
          .post("/register")
          .set('content-type', 'application/x-www-form-urlencoded')
          .send(details))
    .then(res => {
      assert.equal(res.status, 403);
      assert.deepEqual(res.body, ["txt-already-reg", "test_user"]);
    });
  });

  // Promise to register user. Resolve to server.
  function register(server, user) {
    return chai.request(server.express)
    .post("/register")
    .set('content-type', 'application/x-www-form-urlencoded')
    .send(user)
    .then(res => {
      assert.equal(res.status, 200);
      sparseEqual(res.body, {
        name: user.register_username,
        provider: "xanado"
      });
      assert(res.body.key.length > 1);
      assert(!res.body.email);
      return res.body.key;
    });
  }

  // Promise to signin user. Resolve to cookie.
  function signin(server, user) {
    return chai.request(server.express)
    .post("/signin")
    .send(user)
    .then(res => {
      assert.equal(res.status, 200);
      return res.header["set-cookie"];
    });
  }

  it("/register new username", () => {
    const server = new Server(config);
    return chai.request(server.express)
    .post("/register")
    .set('content-type', 'application/x-www-form-urlencoded')
    .send({register_username: "test_user"})
    .then(res => {
      assert.equal(res.status, 200);
      sparseEqual(res.body, {
        name: "test_user",
        provider: "xanado"
      });
      assert(res.body.key.length > 1);
    });
  });

  it("signin / signout", () => {
    let cookie;
    const server = new Server(config);
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })

    // Wrong password
    .then(() => chai.request(server.express)
          .post("/signin?origin=greatapes")
          .send({
            signin_username: "test_user",
            signin_password: "wrong_pass"
          }))
    .then(res => {
      assert.equal(res.status, 401);
      // NO! assert.deepEqual(res.body, ["txt-nosign"]);
    })
    // Right password
    .then(() => signin(server, {
      signin_username: "test_user", signin_password: "test_pass"
    }))
    .then(c => {
      cookie = c;

      return chai.request(server.express)
      .post("/signout")
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.equal(res.status, 200);
      return chai.request(server.express)
      .post("/signout")
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.equal(res.status, 401);
      assert.deepEqual(res.body, ["txt-nosign"]);

      // User with null password
      return register(server, {
        register_username: "test2_user",
        register_email: "test2@email.com"
      });
    })
    .then(() => chai.request(server.express)
          .post("/signin")
          .send({
            signin_username: "test2_user",
            signin_password: "wrong_pass"
          }))
    .then(res => {
      assert.equal(res.status, 401);
      // NO! assert.deepEqual(res.body, ["txt-nosign"]);
      return signin(server, { signin_username: "test2_user" });
    });
  });

  it("signed in /session-settings and /session", () => {
    let  cookie;
    const server = new Server(config);
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })

    .then(() => signin(server, {
      signin_username: "test_user", signin_password: "test_pass"
    }))

    .then(c => {
      cookie = c;
      return chai.request(server.express)
      .get("/session")
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.equal(res.status, 200);
      sparseEqual(res.body, {
        name: "test_user",
        provider: "xanado"
      });
      assert(res.body.key.length > 1);

      return chai.request(server.express)
      .post("/session-settings")
      .set('Cookie', cookie)
      .send({sausages: "bratwurst"});
    })
    .then(res => {
      assert.equal(res.status, 200);

      return chai.request(server.express)
      .get("/session")
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.equal(res.status, 200);
      sparseEqual(res.body, {
        name: "test_user",
        provider: "xanado",
        settings: { sausages: "bratwurst" }
      });
      assert(res.body.key.length > 1);
    });
  });

  it("signed in /users", () => {
    let cookie;
    const server = new Server(config);
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(() => chai.request(server.express)
          .get("/users"))
    .then(res => {
      //console.log(res.body);
      assert.equal(res.status, 401);
      sparseEqual(res.body, [ 'txt-nosign']);

      return signin(server, {
        signin_username: "test_user", signin_password: "test_pass"
      });
    })
    .then(c => {
      cookie = c;
      return chai.request(server.express)
      .get("/users")
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.body);
      assert.equal(res.status, 200);
      sparseEqual(res.body, [{
        name: "test_user"
      }]);
      assert(res.body[0].key.length > 1);
    });
  });

  it("/reset-password", () => {
    let token;
    const server = new Server(config);
    // server.mail.transport hasn't been configured yet
    assert(!server.config.mail);
    //server._debug = console.debug;
    server.config.mail = {
      sender: "unit tests",
      transport: {
        sendMail: function(email) {
          //console.log("Email", email);
          assert.equal(email.from, "unit tests");
          assert.equal(email.to, "test@email.com");
          assert.equal(email.subject, "eml-respw-subject");
          assert(email.text);
          token = email.text.replace(
            /^.*\/password-reset\/(\w+).*$/, "$1");
          return Promise.resolve();
        }
      }
    };
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(() => chai.request(server.express)
          .post("/reset-password")
          .send({reset_email: "unknown@email.com"}))
    .then(res => {
      //console.log(res.body);
      assert.equal(res.status, 403);
      sparseEqual(res.body, [
        "err-player-unknown",
        "unknown@email.com"
      ]);

      return chai.request(server.express)
      .post("/reset-password")
      .send({reset_email: "test@email.com"});
    })
    .then(res => {
      //console.log(res.text, token);
      assert.equal(res.status, 200);
      sparseEqual(res.body, [
        "txt-respw-sent",
        "test_user"
      ]);
      assert(token);

      return chai.request(server.express)
      .get(`/password-reset/${token}`);
    })
    .then(res => {
      // redirect to /
      assert.equal(res.status, 200);
      //assert(res.header["set-cookie"]);
      // The cookie gets set OK, but not here.
      //console.log(res.text);
    });
  });

  it("/change-password", () => {
    let cookie;
    //config.debug = "users";
    const server = new Server(config);
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(() => chai.request(server.express)
          .post("/change-password")
          .send({password: "wtf"}))
    .then(res => {
      assert.equal(res.status, 401);
      sparseEqual(res.body, ["txt-nosign"]);

      return signin(server, {
        signin_username: "test_user",
        signin_password: "test_pass"
      });
    })
    .then(c => {
      cookie = c;

      return chai.request(server.express)
      .post("/change-password")
      .set('Cookie', cookie)
      .send({password: "wtf"});
    })
    .then(res => {
      assert.equal(res.status, 200);
      sparseEqual(res.body, [
        "pass-changed",
        "test_user"
      ]);

      return chai.request(server.express)
      .post("/signout")
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.equal(res.status, 200);

      return chai.request(server.express)
      .post("/session");
    })
    .then(res => {
      assert.equal(res.status, 404);

      return chai.request(server.express)
      .post("/signin")
      .send({
        signin_username: "test_user",
        signin_password: "test_pass"
      });
    })
    .then(res => {
      assert.equal(res.status, 401);
      // NO! assert.deepEqual(res.body, ["txt-nosign"]);
    });
  });
});
