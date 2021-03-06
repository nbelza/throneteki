const _ = require('underscore');

const AgendaCard = require('../../agendacard.js');

class TheRainsOfCastamere extends AgendaCard {
    constructor(owner, cardData) {
        super(owner, cardData);

        // TODO: This is a hack - should not be considered an interrupt but
        //       should fire approx at that timeframe.
        this['onPlotFlip:forcedinterrupt'] = () => this.onPlotFlip();

        this.registerEvents(['onDecksPrepared', 'onPlotFlip:forcedinterrupt']);
    }

    setupCardAbilities() {
        this.reaction({
            when: {
                afterChallenge: (event, challenge) => (
                    !this.owner.faction.kneeled &&
                    challenge.challengeType === 'intrigue' &&
                    challenge.winner === this.owner &&
                    challenge.strengthDifference >= 5
                )
            },
            handler: () => {
                this.game.promptWithMenu(this.owner, this, {
                    activePrompt: {
                        menuTitle: 'Trigger Scheme plot?',
                        buttons: this.menuButtons()
                    },
                    waitingPromptTitle: 'Waiting for opponent to use' + this.name
                });
            }
        });
    }

    onDecksPrepared() {
        this.owner.createAdditionalPile('scheme plots', { title: 'Schemes', area: 'plots', isPrivate: true });
        var schemePartition = this.owner.plotDeck.partition(card => card.hasTrait('Scheme'));
        this.schemes = schemePartition[0];
        this.owner.plotDeck = _(schemePartition[1]);
        _.each(this.schemes, scheme => {
            this.owner.moveCard(scheme, 'scheme plots');
        });
    }

    onPlotFlip() {
        this.removeExistingSchemeFromGame();
    }

    removeExistingSchemeFromGame() {
        var previousPlot = this.owner.activePlot;

        if(!previousPlot || !previousPlot.hasTrait('Scheme')) {
            return;
        }

        this.owner.removeActivePlot('out of game');
    }

    menuButtons() {
        var buttons = _.map(this.schemes, scheme => {
            return { text: scheme.name, method: 'revealScheme', arg: scheme.uuid, card: scheme.getSummary(true) };
        });

        buttons.push({ text: 'Done', method: 'cancelScheme' });
        return buttons;
    }

    revealScheme(player, schemeId) {
        var scheme = _.find(this.schemes, card => card.uuid === schemeId);

        if(!scheme) {
            return false;
        }

        this.game.addMessage('{0} uses {1} to reveal {2}', player, this, scheme);

        this.removeExistingSchemeFromGame();

        this.schemes = _.reject(this.schemes, card => card === scheme);

        player.selectedPlot = scheme;
        player.flipPlotFaceup();
        this.game.raiseEvent('onPlotRevealed', player);

        player.kneelCard(player.faction);

        return true;
    }

    cancelScheme() {
        return true;
    }
}

TheRainsOfCastamere.code = '05045';

module.exports = TheRainsOfCastamere;
