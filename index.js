const MercadoBitcoin = require("./api").MercadoBitcoin
const MercadoBitcoinTrade = require("./api").MercadoBitcoinTrade
require('dotenv').config()

var currency = 'ADA'
var infoApi = new MercadoBitcoin({ currency: currency })
var tradeApi = new MercadoBitcoinTrade({
    currency: currency,
    key: process.env.KEY,
    secret: process.env.SECRET,
    pin: process.env.PIN
})


 //tradeApi.getAccountInfo(response_data => {
 //    console.log(response_data.balance.doge);
 //    process.exit();
 //})


//TODO avaliar disponibilidade antes de executar a operação

var d = {}
d.env = "production" // test | production
d.crawlerIntevalo = 60 * 1000 // Em Segundos
d.quantidadeVendaBrl = 1 //valor em BRL
d.quantidadeCompraBrl = 1 //valor em BRL
d.lucroMinimo = 0.01
d.tradeExecution = 0
d.tradesExecutionMax = 5000


if (d.lucroMinimo < 0.0065 && d.env != "test") {
    console.log("Lucro muito baixo para produção");
    process.exit(1);
}

function definirPrecos(d, lastPrice) {
    d.precoBase = lastPrice
    d.precoMinimoVenda = d.precoBase * (1 + parseFloat(d.lucroMinimo))
    d.precoMaximoCompra = d.precoBase * (1 - parseFloat(d.lucroMinimo))
    d.quantidadeCompraMoeda = d.quantidadeCompraBrl / lastPrice
    d.quantidadeVendaMoeda = d.quantidadeVendaBrl / lastPrice
    let precos = {}
    precos.precoBase = d.precoBase
    precos.precoMinimoVenda = d.precoMinimoVenda
    precos.precoMaximoCompra = d.precoMaximoCompra
    console.log("Novos preços obtidos: ");
    console.log(d)
}

function tentarTrade() {
    if ((!d.tradeExecution && d.tradeExecution != 0) || d.tradeExecution > d.tradesExecutionMax) {
        console.log("Número máximo de trades executados, finalizando... bom lucro!");
        console.log(d)
        process.exit(0)
    }


    infoApi.ticker((tick) => {
        tick = tick.ticker
        console.log("Valor atual: "+ tick.last + " em " + new Date().toTimeString())

        // Vender
        if (tick.last >= d.precoMinimoVenda) {
            if (d.env === "test") {
                console.log(`SIMULAÇÃO - Criada ordem de venda ${d.quantidadeVendaMoeda} por ${tick.last}`)
                console.log('SIMULAÇÃO - Ordem de venda inserida no livro.')
                d.tradeExecution++;
                definirPrecos(d, tick.last)
            }
            if (d.env === "production") {
                tradeApi.placeSellOrder(d.quantidadeVendaMoeda, tick.last * 0.999,
                    (data) => {
                        console.log(`Criada ordem de venda ${d.quantidadeVendaMoeda} por ${tick.last}`)
                        d.tradeExecution++;
                        definirPrecos(d, tick.last)
                    },
                    (data) => {
                        console.log('Erro ao inserir ordem de venda no livro. ' + data)
                    }
                )
            }
        } else {
        //    console.log("Barato demais para vender, aguarde mais um pouco até alcançar " + d.precoMinimoVenda)
        }

        // Comprar
        if (tick.last <= d.precoMaximoCompra) {
            if (d.env === "test") {
                console.log(`SIMULAÇÃO - Criada ordem de compra ${d.quantidadeCompraMoeda} por ${tick.last}`)
                console.log('SIMULAÇÃO - Ordem de compra inserida no livro.')
                d.tradeExecution++;
                definirPrecos(d, tick.last)
            }
            if (d.env === "production") {
                tradeApi.placeBuyOrder(d.quantidadeCompraMoeda, tick.last * 1.001,
                    (data) => {
                        console.log(`Criada ordem de compra ${d.quantidadeCompraMoeda} por ${tick.last}`)
                        d.tradeExecution++;
                        definirPrecos(d, tick.last)
                    },
                    (data) => {
                        console.log('Erro ao inserir ordem de compra no livro. ' + data)
                    }
                )
            }
        } else {
         //   console.log("Caro demais para comprar, aguarde mais um pouco até alcançar " + d.precoMaximoCompra)
        }
    })
}

function rodar() {
    infoApi.ticker((tick) => {
        definirPrecos(d, parseFloat(tick.ticker.last))
        setInterval(() => tentarTrade(), d.crawlerIntevalo)
    })
}

////////////////////////////// Início da execução //////////////////////////////////////////////////

rodar();
