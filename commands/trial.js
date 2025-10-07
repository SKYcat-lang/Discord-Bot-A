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
const userActivity = new Map(); // userId → { time, flags: [msgID1, msgID2...] }
const adminID = "604561235442401280";

// ======================
// 🔹 클래스
// ======================
class trialClass {
  constructor(Author, Content) {
    this.vtMember = [];
    this.vtA = 0;
    this.vtB = 0;
    this.msgContent = Content || "(내용 없음)";
    this.msgAuthor = Author;
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

    // 현재 진행중인 모든 투표 ID 목록 추출
    const activeTrials = Object.keys(trialobj);

    userActivity.set(userId, {
      time: now,
      flags: [...activeTrials], // 🔥 진행중인 모든 투표에 대해 flag 기록
    });

    // 오래된 기록 정리 (1시간 이상)
    const oneHour = 60 * 60 * 1000;
    for (const [id, data] of userActivity.entries()) {
      if (now - data.time > oneHour) userActivity.delete(id);
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
    .setColor("FF0000")
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
    if (!trialobj[msg.id]?.vtMember) {
      await interactionCollect.reply({
        content: "유효하지 않은 투표입니다.",
        ephemeral: true,
      });
      return;
    }

    const userId = interactionCollect.user.id;
    const activity = userActivity.get(userId);
    const oneHour = 60 * 60 * 1000;

    // 최근 채팅 기록 없거나 오래된 경우
    if (!activity || Date.now() - activity.time > oneHour) {
      await interactionCollect.reply({
        content: "⏰ 최근 1시간 내 채팅 기록이 없어 투표할 수 없습니다.",
        ephemeral: true,
      });
      return;
    }

    // 현재 투표 중 작성된 메시지라면 투표 불가
    if (activity.flags.includes(msgID)) {
      await interactionCollect.reply({
        content:
          "⚠️ 이 메시지는 현재 투표 진행 중에 입력된 채팅이라 투표 자격으로 인정되지 않습니다.",
        ephemeral: true,
      });
      return;
    }

    // 이미 투표한 유저
    if (trialobj[msgID].vtMember.includes(userId)) {
      userId == adminID
        ? await showControlPanel(interactionCollect, msgID)
        : await interactionCollect.reply({
            content: "이미 투표에 참여하셨습니다.",
            ephemeral: true,
          });
      return;
    }

    // ✅ 정상 투표
    interactionCollect.customId === msgID + "/yes"
      ? trialobj[msgID].vtA++
      : trialobj[msgID].vtB++;

    trialobj[msgID].vtMember.push(userId);
    await interactionCollect.reply({
      content: "투표가 완료되었습니다.",
      ephemeral: true,
    });

    console.log(
      `${userId} → ${msgID} 메시지에 투표`,
      `찬성:${trialobj[msgID].vtA}, 반대:${trialobj[msgID].vtB}`
    );
  };

  // ======================
  // 🔸 선택 메뉴 처리
  // ======================
  const handleSelectMenuInteraction = async (interactionCollect, msgID) => {
    if (!trialobj[msg.id]?.vtMember) {
      await interactionCollect.reply({
        content: "유효하지 않은 투표입니다.",
        ephemeral: true,
      });
      return;
    }

    const selectedValue = interactionCollect.values[0];
    if (selectedValue === `${msgID}/status`) {
      const statusEmbed = new EmbedBuilder()
        .setTitle("투표 현황")
        .setDescription(
          `찬성: ${trialobj[msgID].vtA}, 반대: ${trialobj[msgID].vtB}`
        );
      await interactionCollect.update({
        embeds: [statusEmbed],
        components: [],
      });
    } else if (selectedValue === `${msgID}/revote`) {
      const index = trialobj[msgID].vtMember.indexOf(adminID);
      if (index > -1) {
        trialobj[msgID].vtMember.splice(index, 1);
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
        .setColor("FF0000")
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
      delete trialobj[msgID].vtMember;
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
    // 모든 유저의 flag에서 이번 msgID 제거
    for (const [uid, data] of userActivity.entries()) {
      if (data.flags.includes(msg.id)) {
        data.flags = data.flags.filter((f) => f !== msg.id);
      }
    }

    if (!trialobj[msg.id]?.vtMember) return;

    const exampleEmbed = new EmbedBuilder()
      .setColor("FF0000")
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
          await member.timeout(60000 * 3.5); // 1분 30초 동안 타임아웃
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
      delete trialobj[msg.id];
    }
  });
};

// ======================
// 🔹 커맨드 데이터
// ======================
export const data = new ContextMenuCommandBuilder()
  .setName("약식 재판 시도")
  .setType(ApplicationCommandType.Message);
