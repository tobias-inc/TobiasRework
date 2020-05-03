/* eslint-disable eqeqeq */
const { Command, ClientEmbed, Constants } = require('../../')

const msgTimeOut = async (msg, time) => {
  await new Promise(function (resolve, reject) {
    setTimeout(resolve, time)
  })
  return msg.reactions.removeAll().catch(() => { })
}

module.exports = class Lyrics extends Command {
  constructor (client, path) {
    super(client, path, {
      name: 'lyrics',
      category: 'music',
      aliases: ['letra'],
      utils: {
        requirements: {
          guildOnly: true
        }
      }
    })
  }

  async run ({ channel, author, t, args }) {
    const embed = new ClientEmbed(author)

    const search = args[0] ? args.join(' ') : args.join(' ')

    const title = search.split('-')[0] || author.presence.activities.map(a => a.details)
    const artist = search.split('-')[1] || author.presence.activities.map(a => a.state.split(';')[0])

    if (search || author.presence.activities.map(a => a.name) == 'Spotify') {
      const hit = await this.client.apis.geniusapi.loadLyrics(title, artist)

      if (hit) {
        let inPage = 0
        const body = this.splitLyric(hit.Lyric);

        (embed
          .setTitle(`${title} - ${artist}`)
        // .setURL(`http://genius.com${path}`)
          .setThumbnail(hit.Art)
          .setDescription(body[0])
          .setFooter(t('commands:lyrics.footer', {
            page: 1,
            total: body.length
          }), author.displayAvatarURL)
        )

        return channel.send(embed).then(async (msg) => {
          if (body.length > 1) {
            await msg.react('◀️')
            await msg.react('▶️')
            const initializeCollector = (msg.createReactionCollector(
              (reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) &&
                user.id === author.id,
              { time: 120000 })
            )

            msgTimeOut(msg, 120000)
            return initializeCollector.on('collect', async (r) => {
              // await r.remove(author.id).catch(() => { })
              if (r.emoji.name == '▶️') {
                if ((inPage + 1) === body.length) {
                  inPage = 0
                  msg.edit(embed.setDescription(body[inPage]).setFooter(t('commands:lyrics.footer', {
                    page: (inPage + 1),
                    total: body.length
                  }), author.displayAvatarURL))
                } else {
                  inPage += 1
                  msg.edit(embed.setDescription(body[inPage]).setFooter(t('commands:lyrics.footer', {
                    page: (inPage + 1),
                    total: body.length
                  }), author.displayAvatarURL))
                }
              } else if (r.emoji.name == '◀️') {
                if ((inPage - 1) === body.length) {
                  inPage = 0
                  msg.edit(embed.setDescription(body[inPage]).setFooter(t('commands:lyrics.footer', {
                    page: (inPage + 1),
                    total: body.length
                  }), author.displayAvatarURL))
                } else {
                  inPage -= 1
                  msg.edit(embed.setDescription(body[inPage]).setFooter(t('commands:lyrics.footer', {
                    page: (inPage + 1),
                    total: body.length
                  }), author.displayAvatarURL))
                }
              }
            })
          }
        })
      } else {
        return channel.send(embed
          .setDescription(`:frowning: **${author.username}**, ${t('commands:lyrics:songNotFound')}`)
          .setColor(Constants.ERROR_COLOR)
        )
      }
    } else {
      return channel.send(embed
        .setDescription(`❌ **${author.username}**, ${t('commands:lyrics:noSong')}`)
        .setColor(Constants.ERROR_COLOR)
      )
    }
  }

  splitLyric (str) {
    return str.match(/(.|[\r\n]){1,500}/g)
  }
}
