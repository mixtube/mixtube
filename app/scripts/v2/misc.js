(function (mt) {
    'use strict';

//    mt.MixTubeApp.controller('mtSearchResultCtrl', function ($scope, $timeout) {
//
//        $scope.searchResultProps = {confirmationShown: false, tmoPromise: null};
//
//        $scope.addItemToQueue = function () {
//            $scope.searchResultProps.confirmationShown = true;
//            $timeout.cancel($scope.searchResultProps.tmoPromise);
//            $scope.searchResultProps.tmoPromise = $timeout(function () {
//                $scope.searchResultProps.confirmationShown = false;
//            }, 4000);
//        }
//    });

//    mt.MixTubeApp.controller('mtBodyCtrl', function ($scope, $location) {
//
//        var _props = {
//            queueSize: 1,
//            queueItemsSrc: ['D874kQpNEpc', 'eU4ZvfkmOck', 'djE-BLrdDDc', 'jb6HZa151s8', 'a35rNEBNiO4', 'URpIzQedQio', '_sV0QuxOHoY'],
//            queueItems: []
//        };
//
//        $scope.props = {
//            showDebugBar: false,
//            showModal: false,
//            showNotification: false,
//            showSearch: false,
//            showChrome: false,
//            showPlayButton: true,
//            activeQueueItem: _props.queueItemsSrc[2],
//            get queueItems() {
//                return _props.queueItems;
//            }
//        };
//
//        $scope.toggleModal = function (lineCount) {
//            var lines = [0, 1, 2, 3, 4, 5, 6, 7];
//            $scope.props.modalLines = lines.slice(0, lineCount);
//            $scope.props.showModal = !$scope.props.showModal;
//        };
//
//        $scope.toggleNotification = function () {
//            $scope.props.showNotification = !$scope.props.showNotification;
//        };
//
//        $scope.toggleComingNext = function () {
//            $scope.props.showComingNext = !$scope.props.showComingNext;
//        };
//
//        $scope.toggleSearch = function () {
//            $scope.props.showSearch = !$scope.props.showSearch;
//            if ($scope.props.showSearch) {
//                $scope.props.showChrome = true;
//            }
//        };
//
//        $scope.appendQueueItem = function () {
//            _props.queueItems = _props.queueItemsSrc.slice(0, _props.queueSize++);
//        };
//
//        $scope.insertQueueItem = function () {
//            _props.queueItems.splice(1, 0, _props.queueItemsSrc[_props.queueSize++]);
//        };
//
//        $scope.removeQueueItem = function (queueItem) {
//            _props.queueItems.splice(_props.queueItems.indexOf(queueItem), 1);
//        };
//
//        $scope.switchActiveQueueItem = function () {
//            $scope.props.activeQueueItem
//                = $scope.props.activeQueueItem === _props.queueItemsSrc[2] ? _props.queueItemsSrc[4] : _props.queueItemsSrc[2];
//        };
//
//        $scope.toggleActivity = function () {
//            $scope.props.showChrome = !$scope.props.showChrome;
//        };
//
//        $scope.togglePlayButton = function () {
//            $scope.props.showPlayButton = !$scope.props.showPlayButton;
//        };
//
//        /**
//         * @returns {number} a "truthy" value means that we have to make sure given queue item is visible
//         */
//        $scope.shouldEnsureVisible = function (queueItem, isLast) {
//            // we return a number here to make sure the value change when the reason for making the element visible changes
//            // avoid the case where it was true before for another reason and say true but for the other reason
//            return isLast << 1 | queueItem === $scope.props.activeQueueItem;
//        };
//
//        $scope.$watch(function () {
//            return $location.search();
//        }, function (newSearch) {
//            $scope.props.showDebugBar = 'debug' in newSearch;
//        });
//
//        $scope.$watch('props.searchTerm', function (newVal) {
//            $scope.props.showSearch = !!newVal;
//        });
//    });
})(mt);