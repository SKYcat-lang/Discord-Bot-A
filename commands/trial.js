import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  StringSelectMenuBuilder,
} from "discord.js";
import axios from "axios";
import config from "../Config.json" assert { type: "json" };
const API_KEY = config.API_KEY;

// ======================
// 🔹 전역 상태
// ======================
let trialobj = {}; // 진행중인 투표 객체
const userActivity = new Map(); // userId → { times: number[] }
const adminID = "604561235442401280";

// ======================
// 🔹 클래스
// ======================
class trialClass {
  constructor(Author, Content) {
    this.vtMember = { yes: [], no: [] };
    this.vtA = 0;
    this.vtB = 0;
    this.msgContent = Content || "(내용 없음)";
    this.msgAuthor = Author;
    this.startTime = Date.now(); // ✅ 투표 시작 시각
  }
}

const isAdmin = (member) => member.permissions.has("ADMINISTRATOR");

// ======================
// 🔹 유저 메시지 기록 추적
// ======================
export const registerMessageTracker = (client) => {
  client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    const now = Date.now();
    const userId = message.author.id;
    const oneHour = 60 * 60 * 1000;

    const prev = userActivity.get(userId) || { times: [] };
    const nextTimes = [...prev.times, now].filter((t) => now - t <= oneHour);

    userActivity.set(userId, { times: nextTimes });

    // (옵션) 맵 자체 청소는 굳이 매번 안 해도 됨. 필요하면 주기적으로 GC // 그렇지만 난 하고 싶은걸.
    for (const [id, data] of userActivity.entries()) {
      const arr = Array.isArray(data.times) ? data.times : [];
      const last = arr[arr.length - 1] || 0;
      if (arr.length === 0 || now - last > oneHour * 6) {
        userActivity.delete(id);
      }
    }
  });
};

// ======================
// 🔹 메인 명령 실행
// ======================
export const execute = async (interaction) => {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "개인 메세지에서는 이 커맨드를 사용할 수 없습니다.",
      ephemeral: true,
    });
    return;
  }

  const msg = interaction.targetMessage;

  if (Object.keys(trialobj).includes(msg.id)) {
    await interaction.reply({
      content: "이미 해당 메세지에 대한 투표가 진행되었습니다.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  trialobj[msg.id] = new trialClass(msg.author, msg.content);

  const avatarURL = msg.author.displayAvatarURL({
    format: "png",
    dynamic: true,
    size: 2048,
  });
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setDescription(trialobj[msg.id].msgContent)
    .setAuthor({ name: `${msg.author.username}`, iconURL: avatarURL })
    .setThumbnail("https://i.ibb.co/t4V5qsf/star-icon.png")
    .addFields({
      name: `\u200B`,
      value: `해당 채팅에 대한 약식 재판을 시작합니다.\nhttps://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id}`,
    })
    .setFooter({ text: "1분 30초 후에 재판의 결과가 발표됩니다." })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(msg.id + "/yes")
      .setLabel("찬성")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(msg.id + "/no")
      .setLabel("반대")
      .setStyle(ButtonStyle.Danger)
  );

  try {
    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error(error);
    delete trialobj[msg.id];
  }

  console.log(msg.id + "에 대한 약식 재판이 시작되었습니다.");

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith(msg.id),
    time: 90000,
  });

  // ======================
  // 🔸 버튼 or 선택 메뉴 처리
  // ======================
  collector.on("collect", async (interactionCollect) => {
    const msgID = interactionCollect.customId.split("/")[0];
    if (!trialobj[msgID]) {
      await interactionCollect.reply({
        content: "이미 종료된 투표입니다.",
        ephemeral: true,
      });
      return;
    }

    try {
      if (interactionCollect.isButton()) {
        await handleButtonInteraction(interactionCollect, msgID);
      } else if (interactionCollect.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interactionCollect, msgID);
      }
    } catch (error) {
      console.error(error);
      delete trialobj[msgID];
    }
  });

  // ======================
  // 🔸 버튼 클릭 로직
  // ======================
  const handleButtonInteraction = async (interactionCollect, msgID) => {
    const userId = interactionCollect.user.id;
    const activity = userActivity.get(userId);
    const oneHour = 60 * 60 * 1000;

    if (!trialobj[msgID]?.vtMember) {
      await interactionCollect.reply({
        content: "유효하지 않은 투표입니다.",
        ephemeral: true,
      });
      return;
    }

    // 투표 시작 시각과 유저의 최근 메시지 목록
    const start = trialobj[msgID].startTime;
    const times = activity?.times || [];

    // 투표 시작 '이전'에 보낸 가장 최근 메시지 찾기
    let lastPreVote = null;
    for (let i = times.length - 1; i >= 0; i--) {
      if (times[i] <= start) {
        lastPreVote = times[i];
        break;
      }
    }

    // 최근 1시간 내 활동 검사
    if (!lastPreVote || start - lastPreVote > oneHour) {
      await interactionCollect.reply({
        content:
          "투표 시작 __이전__ 1시간 내 채팅 기록이 없어 투표할 수 없습니다.",
        ephemeral: true,
      });
      return;
    }

    // 이미 투표한 유저
    if (
      trialobj[msgID].vtMember.yes.includes(userId) ||
      trialobj[msgID].vtMember.no.includes(userId)
    ) {
      userId == adminID
        ? await showControlPanel(interactionCollect, msgID)
        : await interactionCollect.reply({
            content: "이미 투표에 참여하셨습니다.",
            ephemeral: true,
          });
      return;
    }

    // 투표 처리
    if (interactionCollect.customId === msgID + "/yes") {
      trialobj[msgID].vtA++;
      trialobj[msgID].vtMember.yes.push(userId);
    } else if (interactionCollect.customId === msgID + "/no") {
      trialobj[msgID].vtB++;
      trialobj[msgID].vtMember.no.push(userId);
    } else {
      console.log("버그났어!", interactionCollect.customId);
    }

    await interactionCollect.reply({
      content: "투표가 완료되었습니다.",
      ephemeral: true,
    });

    console.log(
      `[투표] ${userId} → ${msgID} / 찬성:${trialobj[msgID].vtA}, 반대:${trialobj[msgID].vtB}`
    );
  };

  // ======================
  // 🔸 선택 메뉴 처리
  // ======================
  const handleSelectMenuInteraction = async (interactionCollect, msgID) => {
    if (!trialobj[msgID]?.vtMember) {
      await interactionCollect.reply({
        content: "유효하지 않은 투표입니다.",
        ephemeral: true,
      });
      return;
    }

    const selectedValue = interactionCollect.values[0];
    if (selectedValue === `${msgID}/status`) {
      const yesList = trialobj[msgID].vtMember.yes.length
        ? trialobj[msgID].vtMember.yes.map((id) => `<@${id}>`).join(", ")
        : "없음";
      const noList = trialobj[msgID].vtMember.no.length
        ? trialobj[msgID].vtMember.no.map((id) => `<@${id}>`).join(", ")
        : "없음";

      const statusEmbed = new EmbedBuilder()
        .setColor("2F3136")
        .setTitle("📊 투표 현황 (관리자)")
        .setDescription(
          `✅ 찬성: ${trialobj[msgID].vtA}명\n❌ 반대: ${trialobj[msgID].vtB}명`
        )
        .addFields(
          { name: "✅ 찬성한 유저", value: yesList, inline: false },
          { name: "❌ 반대한 유저", value: noList, inline: false }
        )
        .setTimestamp();

      await interactionCollect.update({
        embeds: [statusEmbed],
        components: [],
      });
    } else if (selectedValue === `${msgID}/revote`) {
      let removed = false;
      const yesIdx = trialobj[msgID].vtMember.yes.indexOf(adminID);
      if (yesIdx > -1) {
        trialobj[msgID].vtMember.yes.splice(yesIdx, 1);
        trialobj[msgID].vtA = Math.max(0, trialobj[msgID].vtA - 1);
        removed = true;
      }
      const noIdx = trialobj[msgID].vtMember.no.indexOf(adminID);
      if (noIdx > -1) {
        trialobj[msgID].vtMember.no.splice(noIdx, 1);
        trialobj[msgID].vtB = Math.max(0, trialobj[msgID].vtB - 1);
        removed = true;
      }

      if (removed) {
        await interactionCollect.update({
          content: "관리자의 투표가 취소되었습니다. 재투표가 가능합니다.",
          components: [],
        });
      } else {
        await interactionCollect.update({
          content: "관리자는 아직 투표에 참여하지 않았습니다.",
          components: [],
        });
      }
    } else if (selectedValue === `${msgID}/end`) {
      collector.resetTimer({ time: 0 });
      await interactionCollect.update({
        content: "관리자에 의해 투표가 종료되었습니다.",
        components: [],
      });
    } else if (selectedValue === `${msgID}/votecut`) {
      await interactionCollect.update({
        content: "관리자에 의해 투표가 취소되었습니다.",
        components: [],
      });
      const CUTEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription(trialobj[msgID].msgContent)
        .setAuthor({
          name: `${trialobj[msgID].msgAuthor.username}`,
          iconURL: avatarURL,
        })
        .setThumbnail("https://i.ibb.co/t4V5qsf/star-icon.png")
        .addFields(
          {
            name: `${trialobj[msgID].msgAuthor.username} 님에 대한 약식 재판 결과`,
            value: " ",
          },
          { name: " ", value: "``해당 투표가 무효 처리되었습니다.``" }
        )
        .setFooter({ text: "관리자에 의해 종료되었습니다." })
        .setTimestamp();
      await interaction.editReply({ embeds: [CUTEmbed], components: [] });
      delete trialobj[msgID];
    }
  };

  const showControlPanel = async (interactionCollect, msgID) => {
    const controlRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${msgID}/control`)
        .setPlaceholder("관리자 제어 메뉴")
        .addOptions(
          {
            label: "투표 현황",
            description: "현재 투표 현황을 확인합니다.",
            value: `${msgID}/status`,
          },
          {
            label: "재투표",
            description: "내 ID를 목록에서 지워 재투표가 가능하게 만듭니다.",
            value: `${msgID}/revote`,
          },
          {
            label: "투표 종료",
            description: "투표를 즉시 완료합니다.",
            value: `${msgID}/end`,
          },
          {
            label: "투표 취소",
            description: "투표를 즉시 중단합니다.",
            value: `${msgID}/votecut`,
          }
        )
    );
    await interactionCollect.reply({
      content: "관리자 제어 패널.",
      components: [controlRow],
      ephemeral: true,
    });
  };

  // ======================
  // 🔸 투표 종료시 처리
  // ======================
  collector.on("end", async () => {
    if (!trialobj[msg.id]?.vtMember) return;

    const exampleEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setDescription(trialobj[msg.id].msgContent)
      .setAuthor({
        name: `${trialobj[msg.id].msgAuthor.username}`,
        iconURL: avatarURL,
      })
      .setThumbnail("https://i.ibb.co/t4V5qsf/star-icon.png")
      .addFields(
        {
          name: `${
            trialobj[msg.id].msgAuthor.username
          } 님에 대한 약식 재판 결과`,
          value: " ",
        },
        { name: "찬성표", value: String(trialobj[msg.id].vtA), inline: true },
        { name: "반대표", value: String(trialobj[msg.id].vtB), inline: true }
      )
      .setFooter({ text: "투표가 끝났습니다." })
      .setTimestamp();

    const getSocialCredit = async (userId) => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/users/${userId}/social-credit`,
          { headers: { "api-key": API_KEY } }
        );
        return response.data.social_credit;
      } catch (error) {
        console.error("사회 신용 점수 확인에 실패했습니다. : ", error);
        return null;
      }
    };
    const postSocialCredit = async (userId, amount) => {
      try {
        await axios.post(
          `http://localhost:3000/api/users/${userId}/social-credit/decrease`,
          { amount },
          { headers: { "api-key": API_KEY } }
        );
        return amount; // 감소된 크레딧 값 반환
      } catch (error) {
        console.error("사회 신용 점수 감소에 실패했습니다. : ", error);
        return null;
      }
    };

    if (
      trialobj[msg.id].vtA > trialobj[msg.id].vtB &&
      trialobj[msg.id].vtA > 2
    ) {
      let member = await interaction.guild.members.fetch(msg.author.id);
      let credit = Number(trialobj[msg.id].vtA - 1);
      //let socialCredit = await postDecreaseSocialCredit(1234, credit)
      let SocialCredit = await getSocialCredit(msg.author.id);
      await postSocialCredit(msg.author.id, credit);
      exampleEmbed.addFields({
        name: " ",
        value: `\`\`해당 채팅에 대한 처벌이 가결되었습니다.\n(소셜 크레딧 ${credit} 차감, 소셜 크레딧: ${
          SocialCredit - credit
        })\`\`\nhttps://discord.com/channels/${msg.guild.id}/${msg.channelId}/${
          msg.id
        }`,
      });

      try {
        if (SocialCredit < 0) {
          const k = 0.02; // 수렴 속도를 조정하는 상수 (적절히 설정)
          const timeoutMultiplier = 1200 * (1 - Math.exp(-k * -SocialCredit)); // 로그 함수 기반으로 타임아웃 계산
          const timeoutDuration = Math.max(timeoutMultiplier, 210); // 최소 타임아웃 시간은 3.5분 (210초)으로 설정
          await member.timeout((210 + timeoutDuration) * 1000); // 초 단위로 변환하여 타임아웃 적용
        } else {
          await member.timeout(60000 * 3.5); // 3분 30초 동안 타임아웃
        }
      } catch (error) {
        console.error("타임아웃 에러", error);
        exampleEmbed.addFields({
          name: " ",
          value: `\`\`그러나 권한 부족으로 타임아웃 할 수 없습니다.\`\``,
        });
      }
    } else {
      exampleEmbed.addFields({
        name: " ",
        value: `\`\`해당 안건이 부결되었습니다.\`\``,
      });
    }
    try {
      console.log(msg.id, "의 재판이 종료됨.");
      await interaction.editReply({ embeds: [exampleEmbed], components: [] });
    } catch (error) {
      console.error("메세지가 삭제됨", error);
    }
    delete trialobj[msg.id];
  });
};

// ======================
// 🔹 커맨드 데이터
// ======================
export const data = new ContextMenuCommandBuilder()
  .setName("약식 재판 시도")
  .setType(ApplicationCommandType.Message);
