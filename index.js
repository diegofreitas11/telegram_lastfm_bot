const { Telegraf } = require('telegraf');
const LastfmAPI = require('lastfmapi');


const TOKEN = `1087565382:AAGHcZaBnVMtJ1sOuQWvjbjLZbfK4D6H424`;


const PORT = process.env.PORT || 3000;
const URL = process.env.URL || 'https://total-fm.herokuapp.com';

const bot = new Telegraf(TOKEN);

bot.telegram.setWebhook(`${URL}/bot${TOKEN}`);
bot.startWebhook(`/bot${TOKEN}`, null, PORT)

const lfm = new LastfmAPI({
	'api_key' : '87388aa0974f3cc9ddf2e4adac39a39e',
	'secret' : '3819563ca5a126a2fa46b992c52eb6ef'
});

const membros = ['thepaulbranco', 'fltngboy', 'itsdanielyall', 'mad-inside', 
    'rheiselsilva', 'siamesedrearn'];


function toPeriod(str){
    if(!str) return {'period' : 'overall', 'text': ' geral'};
    if(str === 'w') return {'period' : '7day', 'text': ' dos últimos 7 dias'};
    if(str === 'm') return {'period' : '1month', 'text': ' do último mês'};
    if(str === '3m') return {'period' : '3month', 'text': ' dos últimos 3 meses'};
    if(str === '6m') return {'period' : '6month', 'text': ' dos últimos 6 meses'};
    if(str === 'y') return {'period' : '12month', 'text': ' de um ano pra cá'};
}

bot.command('comp', (ctx) => {
    let chatID = ctx.chat.id;
    let split = ctx.message.text.split(' ');

    var firstUser = {'username': split[1], 'top': [], 'total': 0};
    var secUser = {'username': split[2], 'top': [], 'total': 0};
    const limit = split[3];
    const periodObj = toPeriod(split[4]);
    
    console.log(periodObj);
    lfm.user.getTopArtists({
        'user': firstUser.username, 
        'api_key': lfm.api_key, 
        'period': periodObj.period,
        'limit': limit
    }, (err, top) => {
        if(err){ 
            if(err.error === 6){
                bot.telegram.sendMessage(chatID, 'usuário não encontrado');
            }
            return;
        }
        top.artist.forEach(artist =>{
            firstUser.top.push({'name': artist.name, 'plays': artist.playcount});
            firstUser.total+=parseInt(artist.playcount)

            if(firstUser.top.length == limit){
                lfm.user.getTopArtists({
                    'user': secUser.username, 
                    'api_key': lfm.api_key, 
                    'period': periodObj.period,
                    'limit': limit
                }, (err, top) => {
                    if(err){
                        if(err.error === 6){
                            bot.telegram.sendMessage(chatID, 'usuário não encontrado');
                        }
                        return;
                    }
                    top.artist.forEach(artist => {
                        secUser.top.push({'name': artist.name, 'plays': artist.playcount});
                        secUser.total+=parseInt(artist.playcount);
            
                        if(secUser.top.length == limit){
                            let result = compare(firstUser, secUser);
                            let resp;
                            if (result.count == 0){
                                resp = `Nenhum artista bate no top ${limit} de ${firstUser.username} e ${secUser.username}`;
                            }else{
                                resp = `o top ${limit} de ${firstUser.username} e ${secUser.username + periodObj.text} batem em ${Math.round((result.count / limit) * 100).toFixed(2)}% (${result.count} artista(s))
                                    \n Principais artistas em comum \n`;
                                for(i = 0; i < result.top.length; i++){
                                    resp+= `${i+1}º - ${result.top[i].artista.name} \n`;
                                }
                                    
                            }
                            bot.telegram.sendMessage(chatID, resp);
                        }
            
                    });
                });
            }
        });
    });


})



bot.command('r', (ctx) => {
    const chatID = ctx.chat.id;
    const artist = ctx.message.text.replace(ctx.message.text.split(' ')[0], "").trim();
    console.log(artist);

    const ranking = [];
    let itemsProcessed = 0;

    membros.forEach(membro => {
        lfm.artist.getInfo({'artist': artist, 
        'api_key' : lfm.api_key, 
        'username' : membro}, (err, info) => {
            if(err) {
                bot.telegram.sendMessage(chatID, 'deu errado fia');
            }
            ranking.push({'user': membro, 'plays': info.stats.userplaycount})
            itemsProcessed++;
            if(itemsProcessed === membros.length){
                let resposta = makeRanking(ranking, artist);
                bot.telegram.sendMessage(chatID, resposta);
            }
        })
        
    })

})

bot.command('ra', (ctx) => {
    const chatID = ctx.chat.id;
    const album = ctx.message.text.replace(ctx.message.text.split(' ')[0], "");
    const split = album.split('-');
    if(split[0] && split[1]){
        var artist = album.split('-')[0].trim();
        var title = album.split('-')[1].trim();
    }else{
        bot.telegram.sendMessage(chatID, 'deu errado fia'); return;
    }

    const ranking = [];
    let itemsProcessed = 0;

    membros.forEach(membro => {
        lfm.album.getInfo({
        'album' : title,
        'artist': artist, 
        'api_key' : lfm.api_key, 
        'username' : membro}, (err, info) => {
            if(err) {bot.telegram.sendMessage(chatID, 'deu errado fia'); return;};
            ranking.push({'user': membro, 'plays': info.userplaycount})
            itemsProcessed++;
            if(itemsProcessed === membros.length){
                let resposta = makeRanking(ranking, album);
                bot.telegram.sendMessage(chatID, resposta);
            }
        })
        
    })

})

bot.command('rm', (ctx) => {
    const chatID = ctx.chat.id;
    const track = ctx.message.text.replace(ctx.message.text.split(' ')[0], "");
    const split = track.split('-');
    if(split[0] && split[1]){
        var artist = track.split('-')[0].trim();
        var title = track.split('-')[1].trim();
    }else{
        bot.telegram.sendMessage(chatID, 'deu errado fia'); return;
    }

    const ranking = [];
    let itemsProcessed = 0;

    membros.forEach(membro => {
        lfm.track.getInfo({
        'track' : title,
        'artist': artist, 
        'api_key' : lfm.api_key, 
        'username' : membro}, (err, info) => {
            if(err) {bot.telegram.sendMessage(chatID, 'deu errado fia');return;};
            ranking.push({'user': membro, 'plays': info.userplaycount})
            itemsProcessed++;
            if(itemsProcessed === membros.length){
                let resposta = makeRanking(ranking, track);
                bot.telegram.sendMessage(chatID, resposta);
            }
        })
        
    })

})

bot.command('list', (ctx) => {
    chatID = ctx.chat.id;
    const limit = ctx.message.text.split(' ')[1];
    var chart = [];
    var itemsProcessed = 0;

    membros.forEach(username =>{    
        lfm.user.getTopArtists({'user': username, 'api_key':lfm.api_key, 
                                'period': 'overall', 'limit': limit},
        (err, top) => {
            if(err){bot.telegram.sendMessage(chatID, 'deu errado fia'); return;}
            top.artist.forEach((artist, i)=>{
                var found = chart.find(element => element.nome === artist.name);
                if(!found){
                    chart.push({'nome': artist.name, 'pts': 1});
                }else{
                    found.pts = (parseInt(found.pts) + 1).toString();
                }
            })
            itemsProcessed++;
            if(itemsProcessed === membros.length){
                let resposta = makeList(chart, limit)
                bot.telegram.sendMessage(chatID, resposta);
            }
        });
    })

    

});

function makeChart(chart, qtd){
    chart.forEach(artist => {
        artist.pts = artist.pts / 5;
    });

    chart.sort((a, b) => {
        return b.pts - a.pts;
    })
    
    let resposta = '-----Top Total----- \n';
    for(var i = 0; i < qtd; i++){
        resposta += `${i+1}º) ${chart[i].nome} - ${chart[i].pts} \n`
    }

    return resposta;
}

function makeRanking(ranking, head){
    ranking.sort((a, b) => {
        return b.plays - a.plays;
    })

    let resposta = `top total para ${head} \n`;
    for(var i = 0; i < ranking.length; i++){
        resposta += `${i+1}º) ${ranking[i].user} - ${ranking[i].plays} \n`
    }

    return resposta;
}

function makeList(chart, limit){
    chart.sort((a, b) => {
        return b.pts - a.pts;
    })
    
    let resposta = '';
    for(var i = 5; i > 1; i--){
        resposta += `No top ${limit} de ${i}: \n`
        let filtered = chart.filter((item) => item.pts == i);
        if(filtered.length > 0){
            filtered.forEach((el, i) => {
                resposta += `${el.nome}`;
                i+1 == filtered.length ? resposta+=' \n': resposta+=', ' ;
            })
        }else{
            resposta += 'Nenhum. \n';
        }
    }

    return resposta;
}

function compare(array1, array2){
    let count = 0;
    let top = [];

    console.log(array1);
    console.log(array2);

    array1.top.forEach((artistX, i1) => {
        array2.top.forEach((artistY, i2) => {
            if(artistX.name === artistY.name){
                count++;
                
                let media = (i1+1 + i2+1) / 2;
                console.log(media);

                if(top.length < 5){
                    top.push({'artista': artistX, 'media': media});
                    top.sort((a, b) => a.media - b.media);
                }else {
                    if(media < top[4].media){
                        top.pop();
                        top.push({'artista': artistX, 'media': media});
                        top.sort((a, b) => a.media - b.media);
                    }
                    
                }
            }
        })
    })
    console.log(top);
    let result;

    if(count > 0){
        result = {'count': count, 'top': top}
    }else{
        result = {'count': count };
    }
    return result;
}



bot.launch();