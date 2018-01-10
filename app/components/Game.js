import React from 'react';
import { Platform, StyleSheet, Text, View, Button, PanResponder, Dimensions, Image, Animated, TouchableOpacity, AsyncStorage, Alert } from 'react-native';
import Modal from 'react-native-modal';
import HexGrid from './HexGrid.js';
import { adjacentTiles, keyTiles } from '../helpers/tileLogic';
import shuffledDeck from '../helpers/shuffledDeck';
import calculateScore from '../helpers/calculateScore';
import handAnimations from '../helpers/handAnimations';
import cardImages from '../helpers/cardImages';
import HelpModal from '../modals/HelpModal';
import HallOfFameModal from '../modals/HallOfFame';
import GameOverModal from '../modals/GameOverModal';
import facebookLogin from '../helpers/facebookLogin';
import database from '../firebase/db.js';
import initializeSounds from '../helpers/initializeSounds';
import CreditsModal from '../modals/CreditsModal'
import moment from 'moment';
import {
  AdMobBanner,
  AdMobInterstitial,
  PublisherBanner,
  AdMobRewarded,
} from 'react-native-admob'
import KEYS from '../../keys.js';

const {height, width} = Dimensions.get('window');



export default class Game extends React.Component {
  constructor(props){
    super(props)
    console.ignoredYellowBox = [
      'Setting a timer'
    ];
    this.state = {
      title: ['A', 'R', 'C', 'A', 'D', 'E'],
      title2: ['P', 'O', 'K', 'E', 'R'],
      deck: shuffledDeck().slice(),
      currentTile: null,
      startingTiles: [1, 4, 3, 4, 1],
      selectedTiles: [],
      chosenCards:[],
      tileResponders: {},
      adjacentTiles: adjacentTiles,
      availableTiles: [],
      destroy: false,
      completedHands: [],
      animatedHand: handAnimations,
      lastCompletedHand: '',
      hoverHand: [],
      emptyTiles: [],
      restart: false,
      gameStarted: false,
      hofModal: false,
      blinky: false,
      gameOverModal: false,
      totalscore: 0,
      highscore: 0,
      newChallenger: 0,
      sound: 'on',
      soundBytes: undefined,
      grabTileResponders: false,
      easterEggs: [],
      isAndroid: false,
      animatedCake: []
    }
    this._panResponder = PanResponder.create({
      onMoveShouldSetPanResponder:(evt, gestureState) => this.state.gameStarted,
      onPanResponderMove: (evt, gestureState) => {
        // console.log(gestureState)
        tileResponders = this.state.tileResponders;
        currentTile = this.state.currentTile;
        // console.log(this.generateAvailableTiles(this.state.currentTile))

        if (currentTile === null) {
          for(key in tileResponders) {
            // if touch gesture is between boxes...
            if (gestureState.numberActiveTouches === 1) {
              insideX = gestureState.moveX >= tileResponders[key].x && gestureState.moveX <= (tileResponders[key].x + 40);
              insideY = gestureState.moveY >= tileResponders[key].y && gestureState.moveY <= (tileResponders[key].y + 55);
              if (insideX && insideY) {
                this.selectNewTile(key);
              }
            }
          }
        }
        else {
          let neighborTiles = this.state.availableTiles
          for (let i = 0; i < neighborTiles.length; i++) {
            if (gestureState.numberActiveTouches === 1) {
              key = neighborTiles[i]
              insideX = gestureState.moveX >= tileResponders[key].x && gestureState.moveX <= (tileResponders[key].x + 40);
              insideY = gestureState.moveY >= tileResponders[key].y && gestureState.moveY <= (tileResponders[key].y + 55);
              if (insideX && insideY) {
                this.selectNewTile(key);
              }
            }
          }
        }
      },
      onPanResponderTerminate: (evt) => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (this.state.chosenCards.length === 5 && this.state.selectedTiles.length === 5 && this.noBlanks(this.state.chosenCards)) {
          this.destroy();
        } else {
          this.reset();
        }
      }
    });
  }

  noBlanks(arr) {
    return arr.every(card => card["value"] !== "");
  }


  async componentDidMount() {
    console.log('JABRONIIIII')
    let adBlock = await AsyncStorage.getItem('adBlock');
    if (adBlock === 'true') this.setState({adBlock: true});
    if (Platform.OS === 'android') this.setState({isAndroid: true})
    let sound = await AsyncStorage.getItem('sound');
    if (sound === null) {
      this.setState({sound: 'on'})
    } else {
      this.setState({sound});
    }
    this.updateScoreFromAsyncStorage();
    this.setState({blinky: true});
    this.insertCoin = setInterval(this.blinky.bind(this), 750)
    let SOUNDS = initializeSounds();
    this.setState({
      soundBytes: SOUNDS
    })
  }


  blinky() {
    this.setState({
      blinky: !this.state.blinky
    })
  }

  loginToFacebookFromHomeScreen() {
    facebookLogin('relog').then(resObj => {
      this.updateScoreFromAsyncStorage();
    });
  }



  restartGame() {
    this.updateScore();
    this.closeModal();
    this.setState({
      deck: shuffledDeck(),
      currentTile: null,
      startingTiles: [],
      startingTiles: [1, 4, 3, 4, 1],
      chosenCards:[],
      adjacentTiles: adjacentTiles,
      availableTiles: [],
      destroy: false,
      completedHands: [],
      animatedHand: handAnimations,
      lastCompletedHand: '',
      hoverHand: [],
      restart: true,
      emptyTiles: [],
      gameStarted: false,
      showScore: false,
      totalscore: 0,
      newChallenger: 0,
      easterEggs: [],
      animatedCake: []
    }, () => {
      this.setState({
        restart: false
      })
      this.playSound('gameloaded')
    })
    this.insertCoin = setInterval(this.blinky.bind(this), 750)
  }


  selectNewTile(key) {
    if (this.state.selectedTiles.indexOf(key) === -1) {
      this.playSound('select');
      this.setState({
        selectedTiles: [...this.state.selectedTiles, key]
      })
    }
    this.setState({
      currentTile: key,
      availableTiles: adjacentTiles[key]
    })
  }

  setLayout(pos, obj) {
    this.state.tileResponders[pos] = obj;
    this.setState({
      tileResponders: this.state.tileResponders,
    })
    let length = Object.keys(this.state.tileResponders).length;
    if(length === 13) {
      this.setState({
        grabTileResponders: true
      })
    }
  }

  destroy() {
    this.state.completedHands.push(calculateScore(this.state.chosenCards))
    hand = calculateScore(this.state.chosenCards);

    this.playSound('tileDrop');
    this.setState({
      destroy: true,
      pressed: true,
      lastCompletedHand: hand[0],
      totalscore: this.state.totalscore += hand[1],
    }, () => {
      this.updateScore();
      this.setState({
        destroy: false,
        chosenCards: [],
        selectedTiles: [],
        currentTile: null,
      })
      // connected to scoring animation and storing KEY TILES
      setTimeout(() => {this.setState({
        pressed: false,
        hoverHand: []
      })}, 750)
    });
  }

  addEmptyTiles(tile) {
    if (!this.state.emptyTiles.includes(tile)) {
      this.setState({
        emptyTiles: [...this.state.emptyTiles, tile]
      }, () => this.checkGameOver())
    }
  }

  checkGameOver() {
    if (this.state.emptyTiles.length === 5 || this.state.completedHands.length === 10) {
      this.gameOver();
    }
  }

  gameOver() {
    setTimeout(() => this.switchModal('game over'), 500)
  }

  updateScore() {
    if (this.state.totalscore > this.state.highscore) {
      let highscore = this.state.totalscore.toString();
      this.setState({highscore})
    }
  }

  async updateScoreFromAsyncStorage(user) {
    let highscore = await AsyncStorage.getItem('highscore');
    highscore = highscore || 0;
    this.setState({highscore});
  }



  reset() {
    if (this.state.chosenCards.length > 0) {
      this.playSound('reset');
      this.setState({
        destroy: true,
        chosenCards: [],
        selectedTiles: [],
        hoverHand: [],
        currentTile: null
      }, () => {
        this.setState({
          destroy: false
        })
      })
    }
  }

  addToChosenCards(card) {
    let alreadyChosen = this.state.chosenCards.indexOf(card);
    if (alreadyChosen === -1 && this.state.chosenCards.length < 5) {
      this.setState({
        chosenCards: [...this.state.chosenCards, card],
        hoverHand: [...this.state.hoverHand, card]
      })
    }
  }

  startGame() {
    clearInterval(this.insertCoin)
    this.setState({
      gameStarted: true,
      animateStartOfGame: true
    }, () => {
      this.playSound('startGame')
      this.setState({
        animateStartOfGame: false
      })
    })
    setTimeout(() => {
      this.setState({
        showScore: true
      })
    }, 450)
  }


  closeModal(game, challenger) {
    if (game === 'over') {
      this.restartGame();
    } else if (game === 'hof') {
      this.switchModal('hof')
    } else if (game === 'challenger') {
      this.switchModal('challenger', challenger)
    }  else {
      this.setState({
        helpModal: false,
        mainModal: false,
        hofModal: false,
        gameOverModal: false,
        creditsModal: false
      })
    }
  }


  switchModal(modal, challenger) {
    this.closeModal();

    if(modal === 'main') {
      this.setState({
        mainModal: true
      })
    } else if (modal === 'help') {
      setTimeout(() => {
        this.setState({
          helpModal: true
        })}, 450)
    } else if (modal === 'hof') {
      setTimeout(() => {
        this.setState({
          hofModal: true
        })}, 450)
    } else if (modal === 'game over') {
      setTimeout(() => {
        this.playSound('win');
        this.setState({
          gameOverModal: true
        })}, 450)
    } else if (modal === 'challenger') {
      setTimeout(() => {
        this.setState({
          hofModal: true,
          newChallenger: challenger
        })}, 450)
    } else if (modal === 'WIP') {
      this.setState({creditsModal: true})
    }
  }

  startDuel(room) {
    this.switchModal('WIP');
  }

  playSound(byte) {
    let sound = this.state.soundBytes;
    if (this.state.sound === 'on') {
      if (byte === 'startGame') {
        sound.startGameSound.play();
      } else if (byte === 'select') {
        sound.selectSound.stop(() => {
          sound.selectSound.play()
        });
      } else if (byte === 'tileDrop') {
        sound.tileDropSound.play();
      } else if (byte === 'reset') {
        sound.resetSound.play();
      } else if (byte === 'win') {
        sound.winSound.play();
      } else if (byte === 'gameloaded') {
        sound.gameLoaded.play();
      }
    }
  }

  toggleSound() {
    if (this.state.sound === 'on') {
      this.setState({sound: 'off'});
      AsyncStorage.setItem('sound', 'off');
    } else {
      this.setState({sound: 'on'}, () => {
        this.playSound('select')
      });
      AsyncStorage.setItem('sound', 'on');
    }
  }

  limit(num) {
    if (num <= 0) return 0;
    return num;
  }

  addToBasket(char, idx) {
    let includes = -1;
    for (let i = 0; i < this.state.easterEggs.length; i++) {
      let egg = this.state.easterEggs[i];
      if (JSON.stringify(egg) === JSON.stringify([char, idx])) {
        includes = i;
        break;
      }
    }

    if (includes >= 0) {
      this.state.easterEggs.splice(includes, 1);
      this.setState({
        easterEggs: this.state.easterEggs
      })
    } else {
      this.setState({
        easterEggs: [...this.state.easterEggs, [char, idx]]
      }, () => this.activateEasterEgg())
    }
  }

  checkEasterEggs(char, idx, shift) {
    let top = 0;
    if (shift) top = -15;

    for (let i = 0; i < this.state.easterEggs.length; i++) {
      let egg = this.state.easterEggs[i];
      if (egg[0] === char && egg[1] === idx) {
        return (
          <Text style={{fontFamily: 'ArcadeClassic', fontSize: 65, color: 'red', top: top}}>
            {char}
          </Text>
        )
      }
    }
    return (
      <Text style={{fontFamily: 'ArcadeClassic', fontSize: 65, color: 'white', top: top}}>
        {char}
      </Text>
    )
  }


  activateEasterEgg() {
    let easterEgg = '';
    for (let i = 0; i < this.state.easterEggs.length; i++) {
      let egg = this.state.easterEggs[i];
      easterEgg += egg[0];
    }

    if (easterEgg === 'CAKE') {
      this.animateCake();
    } else if (easterEgg === 'ADPOKE') {
      this.adBlock();
    }
  }

  async adBlock() {
    let adBlock = AsyncStorage.getItem('adblock');
    if (adBlock === 'true') {
      AsyncStorage.removeItem('adblock');
      this.setState({adBlock: false})
    } else {
      AsyncStorage.setItem('adblock', 'true');
      this.setState({adBlock: true})
    }
  }

  animateCake() {
    for (let i = 0 ; i < 7; i++) {
      this.state.animatedCake[i] = {
        value: new Animated.Value(0),
        position: -900
      }
    }

    const animations = this.state.animatedCake.map((cake, i) => {
      return Animated.spring(
        this.state.animatedCake[i].value,
        {
          toValue: 1,
          speed: 1,
          bounciness: 12,
          useNativeDriver: true
        }
      )
    })
    Animated.stagger(100, animations).start()
  }


  render() {


    return (
      <View style={[styles.container, {backgroundColor: 'black'}]}>
        {!this.state.gameStarted ? (
          <View style={[styles.topBanner]}>
            <View>
              <Text style={{fontSize: 40, color: 'black'}}>
                Jabroni
              </Text>
            </View>
            <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
              <View style={{flexDirection: 'row'}}>
                {this.state.title.map((char, i) => (
                  <TouchableOpacity onPress ={() => this.addToBasket(char, i)} key={i}>
                    {this.checkEasterEggs(char, i)}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{flexDirection: 'row', zIndex: 1}}>
                {this.state.title2.map((char, i) => (
                  <TouchableOpacity onPress ={() => this.addToBasket(char, i)} key={i}>
                    {this.checkEasterEggs(char, i, 'shift')}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : (null)}
        {!this.state.gameStarted ? (
          <View style={{flex: 0.5, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontFamily: 'ArcadeClassic', fontSize: 20, color: 'gold'}}>
              highscore:  {this.state.highscore}
            </Text>
          </View>
        ) : (null)}
        {!this.state.gameStarted ? (
          <View style={{flex: 1}}>
            <View style={{flex: 1, flexDirection: 'row', zIndex: 100, width: "40%", justifyContent: 'space-between'}}>
              <TouchableOpacity onPress={() => this.loginToFacebookFromHomeScreen()}>
                <Image source={require('../assets/icons/facebook.png')} style={{top: 15, width: 40, height: 40, resizeMode: 'contain'}}/>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => this.switchModal('hof')}>
                <Image source={require('../assets/icons/trophy.png')} style={{top: 15, width: 40, height: 40, resizeMode: 'contain'}}/>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => this.startDuel()}>
                <Image source={require('../assets/icons/info.png')} style={{top: 15, width: 40, height: 40, resizeMode: 'contain'}}/>
              </TouchableOpacity>
            </View>
          </View>
        ) : (null)}
        {this.state.gameStarted ? (
          <View style={styles.showCase}>
            {this.state.showScore ? (
              <View style={{flex: 1.5, justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'black', flexDirection: 'row', width: "90%", zIndex: 103}}>
                <TouchableOpacity onPress={() => this.switchModal('hof')}>
                  <Image source={require('../assets/icons/trophy.png')} style={{width: 35, height: 35, resizeMode: 'contain'}}/>
                </TouchableOpacity>
                <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                  <Text style={{fontSize: 40, color: 'black'}}>
                    Jabroni
                  </Text>
                  <Text style={{fontSize: 45, fontFamily: 'ArcadeClassic', color: 'white'}}>
                    Score: {this.state.totalscore}
                  </Text>
                  <Text style={{fontFamily: 'ArcadeClassic', fontSize: 25, color: 'gold'}}>
                    highscore: {this.state.highscore}
                  </Text>
                  <Text style={{fontFamily: 'ArcadeClassic', fontSize: 20, color: 'white'}}>
                    Cards  left: {this.limit(this.state.deck.length - 13)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => this.switchModal('main')}>
                  <Image source={require('../assets/icons/question.png')} style={{width: 33, height: 33, resizeMode: 'contain'}}/>
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={{flex: 1, flexDirection: 'row',}}>
              {this.state.pressed ? (
                <View style={[styles.box, {zIndex: 100}]}>
                  <Image source={this.state.animatedHand[this.state.lastCompletedHand]} style={{width: 300, height: 100, resizeMode: 'contain'}}/>
                </View>
              ) : (
                this.state.hoverHand.map((card, i) => {
                  let imageSize = 85;
                  if (this.state.isAndroid) imageSize = 55
                  if (i%2 === 0) {
                    return (
                      <Image source={cardImages[card.value]}
                        style={{top: 15, width: imageSize, height: imageSize, resizeMode: 'contain', marginRight: -15}}
                        key={i}
                      />
                    )
                  } else {
                    return (
                      <Image source={cardImages[card.value]}
                        style={{top:40, width: imageSize, height: imageSize, resizeMode: 'contain', marginRight: -15}}
                        key={i}
                      />
                    )
                  }
                })
              )}
            </View>
            <Modal
              isVisible={this.state.mainModal}
              animationIn={'slideInLeft'}
              animationOut={'slideOutRight'}
            >
            <View style={styles.mainModal}>
              <TouchableOpacity onPress={() => this.switchModal('help')}>
                <Text style={{fontFamily: 'ArcadeClassic', fontSize: 35, color: 'black'}}>
                  Help
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={this.toggleSound.bind(this)}>
                {this.state.sound === 'on' ? (
                  <Text style={{fontFamily: 'ArcadeClassic', fontSize: 35, color: 'black'}}>
                    Sound  Off
                  </Text>
                ) : (
                  <Text style={{fontFamily: 'ArcadeClassic', fontSize: 35, color: 'black'}}>
                    Sound  On
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={this.restartGame.bind(this)}>
                <Text style={{fontFamily: 'ArcadeClassic', fontSize: 35, color: 'black'}}>
                  Restart
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={this.closeModal.bind(this)}>
                <Text style={{fontFamily: 'ArcadeClassic', fontSize: 35, color: 'black'}}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
            </Modal>
            <Modal
              isVisible={this.state.helpModal}
              animationIn={'slideInUp'}
              animationOut={'slideOutDown'}
            >
              <View style={[styles.otherModal, {height: "80%", backgroundColor: 'white'}]}>
                <HelpModal close={this.closeModal.bind(this)}/>
              </View>
            </Modal>
            <Modal
              isVisible={this.state.gameOverModal}
              animationIn={'slideInUp'}
              animationOut={'slideOutDown'}
            >
              <View style={[styles.otherModal, {height: "30%"}]}>
                <GameOverModal
                  close={this.closeModal.bind(this)}
                  totalscore={this.state.totalscore}
                />
              </View>
            </Modal>
          </View>
        ) : (null)}
        <Modal
          isVisible={this.state.hofModal}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
        >
          <View style={[styles.otherModal, {height: "80%"}]}>
            <HallOfFameModal
              close={this.closeModal.bind(this)}
              newChallenger={this.state.newChallenger}
              updateScore={this.updateScoreFromAsyncStorage.bind(this)}
            />
          </View>
        </Modal>
        <Modal
          isVisible={this.state.creditsModal}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
        >
          <View style={[styles.otherModal, {height: "65%"}]}>
            <CreditsModal
              close={this.closeModal.bind(this)}
            />
          </View>
        </Modal>

        <View style={styles.gameContainer} {...this._panResponder.panHandlers} ref="mycomp">
          {this.state.startingTiles.map((tiles, i) => (
            <HexGrid
              deck={this.state.deck}
              tiles={tiles}
              add={this.addToChosenCards.bind(this)}
              chosen={this.state.chosenCards}
              destroy={this.state.destroy}
              layoutCreators={this.setLayout.bind(this)}
              selectedTiles={this.state.selectedTiles}
              restart={this.state.restart}
              gameStarted={this.state.animateStartOfGame}
              addEmpty={this.addEmptyTiles.bind(this)}
              hoverHand={this.state.hoverHand}
              grabTiles={this.state.grabTileResponders}
              x={i}
              key={i}
            />
          ))}
        </View>
        {/* prop up the starting board... */}
        {!this.state.gameStarted ? (
          <View style={{flex: 1, backgroundColor: 'purple', zIndex: 0}}>
          </View>
        ) : (null)}
        <View style={styles.botBanner}>
          {!this.state.gameStarted && this.state.blinky ? (
            <Text style={styles.font} onPress={this.startGame.bind(this)}>
              Press Start
            </Text>
          ) : (
            !this.state.gameStarted ? (
              <Text style={{fontSize: 60}} onPress={this.startGame.bind(this)}>
                Jabroni Code
              </Text>
            ) : (
              this.state.adBlock ? (
                null
              ) : (
                <AdMobBanner
                  adSize="fullBanner"
                  adUnitID={KEYS.adMob}
                  onAdFailedToLoad={error => console.log(error)}
                />
              )
            )
          )}
        </View>
        {!this.state.gameStarted ? (
          <View style={{position: 'absolute', zIndex: 999, left: 10, top: height - 100, flexDirection: 'row'}}>
            {this.state.animatedCake.map((cake, i) => {
              return (
                <Animated.View key={i} style={{
                  transform: [{
                    translateY: this.state.animatedCake[i].value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-600, 0]
                    })
                  }],
                }}>
                <Image
                  source={require('../assets/icons/cake.png')}
                  style={[{width: 50, height: 50, resizeMode: 'contain'}]}
                />
              </Animated.View>
            )
          })}
        </View>
        ) : ( null )}
        {/* {boxes.map((tiles, i) => {
          return (
            <View style={{width: 40, height: 55, top: tiles.y, left: tiles.x ,backgroundColor:'red', position: 'absolute', zIndex: 999}} key={i}/>
          )
        })} */}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBanner: {
    flex: 2,
    flexDirection: 'column',
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    width: "100%",
  },
  titleCard: {
    width: 200,
    height: 50,
    resizeMode: 'contain'
  },
  showCase: {
    flex: 3.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    width: "100%",
    flexDirection: 'column',
    zIndex: 100
  },
  gameContainer: {
    flex: 5,
    flexDirection: 'row',
    backgroundColor: 'black',
    width: "100%",
    alignItems: 'center',
    justifyContent: 'center',
    // height: "100%",
    zIndex: 99
  },
  botBanner: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    width: "100%",
  },
  mainModal: {
    backgroundColor: 'white',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  otherModal: {
    backgroundColor: 'white',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    height: "60%"
  },
  font: {
    fontSize: 40,
    fontFamily: 'ArcadeClassic',
    color: 'white'
  },
});
