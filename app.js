document.getElementById('date-range-start').value = moment().subtract(40, 'years').format('YYYY-MM-DD');
document.getElementById('date-range-end').value = moment().format('YYYY-MM-DD');

function formatCurrency(value) {
  return ((Math.round(value * 100) / 100) + '').split('.').join(',');
}

function decodeInputString() {
  const rows = document.getElementById('transactions-input').value.split('\n').map(row => row.split('\t'));
  const decodedTransactions = rows.map(rawColumns => {
    const shareCount = parseInt(rawColumns[2].trim().split(',').join('.'));
    const value = parseFloat(rawColumns[3].split(' ').join('').split('.').join('.'));

    return {
      date: moment(rawColumns[0].trim(), "DD-MM-YYYY"),
      shareName: rawColumns[1].trim(),
      count: shareCount,
      ownedCount: shareCount,
      purchase: value < 0,
      value,
      result: 0
    };
  });
  return decodedTransactions.sort((a, b) => a.date.unix() - b.date.unix());
}

function getTimeRange() {
  const startDateString = document.getElementById('date-range-start').value;
  const endDateString = document.getElementById('date-range-end').value;

  return {
    start: moment(startDateString, 'YYYY-MM-DD'),
    end: moment(endDateString, 'YYYY-MM-DD'),
  }
}

function getProfitAtRange() {
  const { start, end } = getTimeRange();
  const transactions = decodeInputString();


  const purchaseTransactions = transactions.filter(t => t.purchase);
  const sellTransactions = transactions.filter(t => !t.purchase);

  let result = 0;

  sellTransactions.forEach(sellTransaction => {
    let sellCount = 0;

    purchaseTransactions.filter(t => t.shareName === sellTransaction.shareName && t.ownedCount > 0).forEach(purchaseTransaction => {
      const shouldSubtractCount = sellCount < sellTransaction.count;

      if (shouldSubtractCount) {
        const toSellCount = Math.min(purchaseTransaction.ownedCount, purchaseTransaction.count);
        sellCount += toSellCount;
        purchaseTransaction.ownedCount -= toSellCount;
        const sharePurchaseCost = purchaseTransaction.value / purchaseTransaction.count;
        const shareSellCost = sellTransaction.value / sellTransaction.count;
        const transactionWithinRange = sellTransaction.date.isBetween(start, end);

        if (transactionWithinRange) {
          const sellResult = toSellCount * (sharePurchaseCost + shareSellCost);
          sellTransaction.result += sellResult;
          result += sellResult;
        }
      }
    });
  });

  const resultPrefix = result >= 0 ? 'Voitto' : 'Tappio';

  document.getElementById('result').innerHTML = `
    <table>
      <tr>
        <th>pvm</th>
        <th>osake</th>
        <th>määrä</th>
        <th>arvo</th>
        <th>tuotto</th>
        <th>tyyppi</th>
      </tr>
      ${transactions.map(transaction => `
        <tr>
          <td>${transaction.date.format('DD.MM.YYYY')}</td>
          <td>${transaction.shareName}</td>
          <td>${transaction.count}</td>
          <td>${formatCurrency(transaction.value)}</td>
          ${
    transaction.result === 0
      ? '<td></td>'
      : `<td>${transaction.result < 0 ? '' : '+'}${formatCurrency(transaction.result)}</td>`
    }
          <td>${transaction.value < 0 ? 'osto' : 'myynti'}</td>
        </tr>
      `).join('')}
    </table>
    <p><span style="color: ${result < 0 ? 'red' : 'green'};font-weight: bold;">${resultPrefix}</span> välillä ${start.format('DD.MM.YYYY')} - ${end.format('DD.MM.YYYY')}: <b>${formatCurrency(result)} €</b></p>
  `;
}

function update() {
  getProfitAtRange();
}

