const LndGrpc = require('lnd-grpc') // wrapper for Lnd gRPC API
const { bech32 } = require('bech32') 

// Due to updated ECDSA generated tls.cert we need to let gprc know that
// we need to use that cipher suite otherwise there will be a handhsake
// error when we communicate with the lnd rpc server.
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA'

class LndNode {
	constructor(lnd) {
		console.log('LndNode: ', JSON.stringify(lnd))
		this.grpc = new LndGrpc({
	      host: lnd.host,
	      cert: lnd.cert,
	      macaroon: lnd.macaroon
	    })
	}

	async connect() {
		await this.grpc.connect()
		const { Lightning } = this.grpc.services
		  console.log('LND: Connected to ',  JSON.stringify((await Lightning.getInfo()).alias));
	}

	async findInvoice(pr) {
		const { Lightning, Invoices } = this.grpc.services
		const resp = await Lightning.decodePayReq({ pay_req: pr })
		return {
			...resp,
			value_sat: resp.num_satoshis,
		}
	}

	async onInvoiceCompletion(callback) {
		const sub = this
			.grpc
			.services
			.Lightning
			.subscribeInvoices({ add_index: 0, settle_index: 0})
		sub.on('data', async invoice => {
			if (invoice.settled) {
				callback(invoice)
			}
		})
	}

	async createInvoice(amt, memo) {
	    const { Lightning } = this.grpc.services
	    return new Promise(async (resolve, reject) => {
	      Lightning.addInvoice({ value: amt, memo: memo}, async function(err, response){
	        if (err) reject(err)
	        else {
	        	const { timestamp, expiry } = await Lightning.decodePayReq({ 
	        		pay_req: response.payment_request })
	        	resolve({
	              r_hash: response.r_hash,
	              payment_request: response.payment_request,
	              expiration: timestamp + expiry
	          	})
	        }
	      })
	      // const response = await Lightning.addInvoice({ value: amt, memo: memo})
	      // console.log('after addInvoice')

	      //   console.log(response)
	      //         resolve({
	      //         r_hash: response.r_hash,
	      //         payment_request: response.payment_request
	      //     })
	    })
	}

	async payInvoice(pay_req) {
		const { Router } = this.grpc.services
	    return new Promise(async (resolve, reject) => {
		      try {
		        const args = { 
		          payment_request: pay_req,
		          no_inflight_updates: true,
		          fee_limit_sat: 100,
		          timeout_seconds: 20
		        }
		        const sub = Router.sendPaymentV2(args)

		        sub.on('data', async invoice => {
	          if (invoice.status === 'SUCCEEDED') { // TODO reference .proto enum
	            resolve(invoice)
	          }
	          if (invoice.status === 'FAILED') { // TODO reference .proto enum
                console.log('LndNode: payment failed', JSON.stringify(invoice));
	            reject(invoice)
	          }
	        })

	        sub.on('end', function() {
	          console.log('Payment stream ended')
	        });
		     } catch (e) {
		     	console.log(e)
		     	reject(e)
		     }
		 })
	}

	async pay(paymentDetails) {
	    const { Router } = this.grpc.services
	    return new Promise(async (resolve, reject) => {

	      try {
	        // console.log('before estimate')
	        // const fee_estimate = await Router.estimateRouteFee({
	        //   dest: paymentDetails.dest,
	        //   amt_sat: paymentDetails.amt
	        // })
	        // console.log('estimate = ')
	        // console.log(fee_estimate)
	        const args = { 
	          ...paymentDetails,
	          no_inflight_updates: true, // TODO add FileSystem logging + change to false
	          amp: true,
	          fee_limit_sat: 100
	        }
	        const sub = Router.sendPaymentV2(args)

	        sub.on('data', async invoice => {
	          if (invoice.status === 'SUCCEEDED') { // TODO reference .proto enum
	            console.log('lndNode: payment received', JSON.stringify(invoice))
	            resolve(invoice)
	          }
	          if (invoice.status === 'FAILED') { // TODO reference .proto enum
	            console.log('lndNode: payment failed', JSON.stringify({ args: args, invoice: invoice }));
	            reject(invoice)
	          }
	        })

	        sub.on('end', function() {
	          //console.log('Payment stream ended')
	        });
	      } catch (err) {
            console.log('lndNode: payment failed', JSON.stringify(err));
	        reject(err)
	      }
	    })
	}

	// async onInvoiceComplete(invoice) {
	// 	const rHash = invoice.r_hash.toString('hex')
	//     const { user_id, onSettle } = await this.db.accounting.get(rHash)

	//     if (onSettle.publish_articles) {
	//       onSettle.publish_articles.forEach(id => this.db.content.publish(id))
	//     } 

	//     if (onSettle.add_read_access) {
	//       onSettle.add_read_access.forEach(async details => {
	//         this.db.content.addReadPurchase(user_id, details)
	//         await this.db.accounting.incBalance(onSettle.add_read_access[0].article_author, invoice.amt_paid_sat) // always inc balance
	        

	//         const authorWallet = await this.db.accounting.getWalletAndLock(details.article_author)
	//         if (authorWallet && authorWallet.auto_pay) {
	//           const requestDetails = {
	//             dest: hexToUint8Array(authorWallet.destination_pub_key), // TODO: wallet.destination_pub_key get from either request body or DB
	//             amt: authorWallet.lnd_balance, // TODO: get from DB. or get from request and validate with DB
	//             timeout_seconds: 20
	//           }
	//           try {
	//             console.log('attempting forward with: ')
	//             console.log(requestDetails)
	//             const responseDetails = await lightning.pay(requestDetails)
	//             this.db.accounting.withdrawalComplete(authorWallet._id, responseDetails)
	//           } catch(err) {
	//             console.log(err)
	//             this.db.accounting.withdrawalComplete(authorWallet._id, null)
	//           }
	//         } else {
	//           console.log('Either wallet does not exist or wallet is locked')
	//         }
	//       })
	//     }
	// }

	//   async checkInvoiceStatus(payHash) {
 //    return new Promise((resolve, reject) => {
 //      this.rpcClient.LookupInvoice({ r_hash_str: payHash }, function(err, response) {
 //        resolve(response)
 //      })
 //    })
 //  }

  // async isInvoiceSettled(payHash) {
  //   return new Promise((resolve, reject) => {
  //     this.rpcClient.LookupInvoice({ r_hash_str: payHash }, function(err, response) {
  //       resolve(response.settled)
  //     })
  //   })
  // }
}

module.exports = LndNode;